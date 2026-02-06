import asyncio
import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional

from anthropic import AsyncAnthropic
from google import genai
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from codegen.utils import extract_html_content
from llm import (
    ANTHROPIC_MODELS,
    GEMINI_MODELS,
    OPENAI_CODEX_MODELS,
    OPENAI_MODELS,
    Llm,
)

from agentic.state import AgentFileState, seed_file_state_from_messages
from agentic.streaming import (
    AnthropicAdapter,
    ExecutedToolCall,
    GeminiAdapter,
    OpenAIChatAdapter,
    OpenAIResponsesAdapter,
    ProviderAdapter,
    StreamEvent,
)
from agentic.tools import (
    AgentToolbox,
    canonical_tool_definitions,
    extract_content_from_args,
    extract_path_from_args,
    serialize_anthropic_tools,
    serialize_gemini_tools,
    serialize_openai_chat_tools,
    serialize_openai_responses_tools,
    summarize_text,
    summarize_tool_input,
)


class AgenticRunner:
    def __init__(
        self,
        send_message: Callable[
            [str, Optional[str], int, Optional[Dict[str, Any]], Optional[str]],
            Awaitable[None],
        ],
        variant_index: int,
        openai_api_key: Optional[str],
        openai_base_url: Optional[str],
        anthropic_api_key: Optional[str],
        gemini_api_key: Optional[str],
        should_generate_images: bool,
        image_cache: Dict[str, str],
        initial_file_state: Optional[Dict[str, str]] = None,
        option_codes: Optional[List[str]] = None,
    ):
        self.send_message = send_message
        self.variant_index = variant_index
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.anthropic_api_key = anthropic_api_key
        self.gemini_api_key = gemini_api_key

        self.file_state = AgentFileState()
        if initial_file_state and initial_file_state.get("content"):
            self.file_state.path = initial_file_state.get("path") or "index.html"
            self.file_state.content = initial_file_state["content"]

        self.toolbox = AgentToolbox(
            self.file_state,
            image_cache,
            should_generate_images,
            openai_api_key,
            openai_base_url,
            option_codes,
        )
        self._tool_preview_lengths: Dict[str, int] = {}

    def _next_event_id(self, prefix: str) -> str:
        return f"{prefix}-{self.variant_index}-{uuid.uuid4().hex[:8]}"

    async def _send(
        self,
        msg_type: str,
        value: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        event_id: Optional[str] = None,
    ) -> None:
        await self.send_message(msg_type, value, self.variant_index, data, event_id)

    def _mark_preview_length(self, tool_event_id: Optional[str], length: int) -> None:
        if not tool_event_id:
            return
        current = self._tool_preview_lengths.get(tool_event_id, 0)
        if length > current:
            self._tool_preview_lengths[tool_event_id] = length

    async def _stream_code_preview(self, tool_event_id: Optional[str], content: str) -> None:
        if not tool_event_id or not content:
            return

        already_sent = self._tool_preview_lengths.get(tool_event_id, 0)
        total_len = len(content)
        if already_sent >= total_len:
            return

        max_chunks = 18
        min_step = 200
        step = max(min_step, total_len // max_chunks)
        start = already_sent if already_sent > 0 else 0

        for end in range(start + step, total_len, step):
            await self._send("setCode", content[:end])
            self._mark_preview_length(tool_event_id, end)
            await asyncio.sleep(0.01)

        await self._send("setCode", content)
        self._mark_preview_length(tool_event_id, total_len)

    async def _handle_streamed_tool_delta(
        self,
        event: StreamEvent,
        started_tool_ids: set[str],
        streamed_lengths: Dict[str, int],
    ) -> None:
        if event.type != "tool_call_delta":
            return
        if event.tool_name != "create_file":
            return
        if not event.tool_call_id:
            return

        content = extract_content_from_args(event.tool_arguments)
        if content is None:
            return

        tool_event_id = event.tool_call_id
        if tool_event_id not in started_tool_ids:
            path = (
                extract_path_from_args(event.tool_arguments)
                or self.file_state.path
                or "index.html"
            )
            await self._send(
                "toolStart",
                data={
                    "name": "create_file",
                    "input": {
                        "path": path,
                        "contentLength": len(content),
                        "preview": summarize_text(content, 200),
                    },
                },
                event_id=tool_event_id,
            )
            started_tool_ids.add(tool_event_id)

        last_len = streamed_lengths.get(tool_event_id, 0)
        if last_len == 0 and content:
            streamed_lengths[tool_event_id] = len(content)
            await self._send("setCode", content)
            self._mark_preview_length(tool_event_id, len(content))
        elif len(content) - last_len >= 40:
            streamed_lengths[tool_event_id] = len(content)
            await self._send("setCode", content)
            self._mark_preview_length(tool_event_id, len(content))

    async def _run_with_adapter(self, adapter: ProviderAdapter) -> str:
        max_steps = 20

        for _ in range(max_steps):
            assistant_event_id = self._next_event_id("assistant")
            thinking_event_id = self._next_event_id("thinking")
            started_tool_ids: set[str] = set()
            streamed_lengths: Dict[str, int] = {}

            async def on_event(event: StreamEvent) -> None:
                if event.type == "assistant_delta":
                    if event.text:
                        await self._send(
                            "assistant",
                            event.text,
                            event_id=assistant_event_id,
                        )
                    return

                if event.type == "thinking_delta":
                    if event.text:
                        await self._send(
                            "thinking",
                            event.text,
                            event_id=thinking_event_id,
                        )
                    return

                if event.type == "tool_call_delta":
                    await self._handle_streamed_tool_delta(
                        event,
                        started_tool_ids,
                        streamed_lengths,
                    )

            step_result = await adapter.run_step(on_event)

            if not step_result.tool_calls:
                return await self._finalize_response(step_result.assistant_text)

            executed_tool_calls: List[ExecutedToolCall] = []
            for tool_call in step_result.tool_calls:
                tool_event_id = tool_call.id or self._next_event_id("tool")
                if tool_event_id not in started_tool_ids:
                    await self._send(
                        "toolStart",
                        data={
                            "name": tool_call.name,
                            "input": summarize_tool_input(tool_call, self.file_state),
                        },
                        event_id=tool_event_id,
                    )

                if tool_call.name == "create_file":
                    content = extract_content_from_args(tool_call.arguments)
                    if content:
                        await self._stream_code_preview(tool_event_id, content)

                tool_result = await self.toolbox.execute(tool_call)
                if tool_result.updated_content:
                    await self._send("setCode", tool_result.updated_content)

                await self._send(
                    "toolResult",
                    data={
                        "name": tool_call.name,
                        "output": tool_result.summary,
                        "ok": tool_result.ok,
                    },
                    event_id=tool_event_id,
                )
                executed_tool_calls.append(
                    ExecutedToolCall(tool_call=tool_call, result=tool_result)
                )

            adapter.apply_tool_results(step_result, executed_tool_calls)

        raise Exception("Agent exceeded max tool turns")

    async def run(self, model: Llm, prompt_messages: List[ChatCompletionMessageParam]) -> str:
        seed_file_state_from_messages(self.file_state, prompt_messages)

        if model in OPENAI_MODELS:
            return await self._run_openai(model, prompt_messages)
        if model in ANTHROPIC_MODELS:
            return await self._run_anthropic(model, prompt_messages)
        if model in GEMINI_MODELS:
            return await self._run_gemini(model, prompt_messages)
        raise ValueError(f"Unsupported model: {model.value}")

    async def _run_openai(
        self,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
    ) -> str:
        if not self.openai_api_key:
            raise Exception("OpenAI API key is missing.")

        client = AsyncOpenAI(api_key=self.openai_api_key, base_url=self.openai_base_url)
        canonical_tools = canonical_tool_definitions()

        try:
            if model in OPENAI_CODEX_MODELS:
                tools = serialize_openai_responses_tools(canonical_tools)
                adapter: ProviderAdapter = OpenAIResponsesAdapter(
                    client=client,
                    model=model,
                    prompt_messages=prompt_messages,
                    tools=tools,
                )
            else:
                tools = serialize_openai_chat_tools(canonical_tools)
                adapter = OpenAIChatAdapter(
                    client=client,
                    model=model,
                    prompt_messages=prompt_messages,
                    tools=tools,
                )
            return await self._run_with_adapter(adapter)
        finally:
            await client.close()

    async def _run_anthropic(
        self,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
    ) -> str:
        if not self.anthropic_api_key:
            raise Exception("Anthropic API key is missing.")

        client = AsyncAnthropic(api_key=self.anthropic_api_key)
        canonical_tools = canonical_tool_definitions()
        tools = serialize_anthropic_tools(canonical_tools)

        try:
            adapter: ProviderAdapter = AnthropicAdapter(
                client=client,
                model=model,
                prompt_messages=prompt_messages,
                tools=tools,
            )
            return await self._run_with_adapter(adapter)
        finally:
            await client.close()

    async def _run_gemini(
        self,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
    ) -> str:
        if not self.gemini_api_key:
            raise Exception("Gemini API key is missing.")

        client = genai.Client(api_key=self.gemini_api_key)
        canonical_tools = canonical_tool_definitions()
        tools = serialize_gemini_tools(canonical_tools)
        adapter: ProviderAdapter = GeminiAdapter(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=tools,
        )
        return await self._run_with_adapter(adapter)

    async def _finalize_response(self, assistant_text: str) -> str:
        if self.file_state.content:
            return self.file_state.content

        html = extract_html_content(assistant_text)
        if html:
            self.file_state.content = html
            await self._send("setCode", html)

        return self.file_state.content
