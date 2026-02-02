import json
import uuid
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam
from anthropic import AsyncAnthropic
from google import genai
from google.genai import types

from codegen.utils import extract_html_content
from config import REPLICATE_API_KEY
from image_generation.core import process_tasks
from llm import Llm, OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ToolExecutionResult:
    ok: bool
    result: Dict[str, Any]
    summary: Dict[str, Any]
    updated_content: Optional[str] = None


@dataclass
class AgentFileState:
    path: str = "index.html"
    content: str = ""


def _summarize_text(value: str, limit: int = 240) -> str:
    if len(value) <= limit:
        return value
    return value[:limit] + "..."


def _ensure_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _parse_json_arguments(raw_args: Any) -> Tuple[Dict[str, Any], Optional[str]]:
    if isinstance(raw_args, dict):
        return raw_args, None
    if raw_args is None:
        return {}, None
    raw_text = _ensure_str(raw_args).strip()
    if not raw_text:
        return {}, None
    try:
        return json.loads(raw_text), None
    except json.JSONDecodeError as exc:
        return {}, f"Invalid JSON arguments: {exc}"


def _strip_incomplete_escape(value: str) -> str:
    if not value:
        return value
    trailing = 0
    for ch in reversed(value):
        if ch == "\\":
            trailing += 1
        else:
            break
    if trailing % 2 == 1:
        return value[:-1]
    return value


def _extract_partial_json_string(raw_text: str, key: str) -> Optional[str]:
    if not raw_text:
        return None
    token = f"\"{key}\""
    idx = raw_text.find(token)
    if idx == -1:
        return None
    colon = raw_text.find(":", idx + len(token))
    if colon == -1:
        return None
    cursor = colon + 1
    while cursor < len(raw_text) and raw_text[cursor].isspace():
        cursor += 1
    if cursor >= len(raw_text) or raw_text[cursor] != "\"":
        return None
    start = cursor + 1
    last_quote: Optional[int] = None
    cursor = start
    while cursor < len(raw_text):
        if raw_text[cursor] == "\"":
            backslashes = 0
            back = cursor - 1
            while back >= start and raw_text[back] == "\\":
                backslashes += 1
                back -= 1
            if backslashes % 2 == 0:
                last_quote = cursor
        cursor += 1
    if last_quote is None:
        partial = raw_text[start:]
    else:
        partial = raw_text[start:last_quote]
    partial = _strip_incomplete_escape(partial)
    if not partial:
        return ""
    try:
        return json.loads(f"\"{partial}\"")
    except Exception:
        return (
            partial.replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\r", "\r")
            .replace("\\\"", "\"")
            .replace("\\\\", "\\")
        )


def _extract_content_from_args(raw_args: Any) -> Optional[str]:
    if isinstance(raw_args, dict):
        content = raw_args.get("content")
        if content is None:
            return None
        return _ensure_str(content)
    raw_text = _ensure_str(raw_args)
    return _extract_partial_json_string(raw_text, "content")


def _extract_path_from_args(raw_args: Any) -> Optional[str]:
    if isinstance(raw_args, dict):
        path = raw_args.get("path")
        return _ensure_str(path) if path is not None else None
    raw_text = _ensure_str(raw_args)
    return _extract_partial_json_string(raw_text, "path")


class AgentToolbox:
    def __init__(
        self,
        file_state: AgentFileState,
        image_cache: Dict[str, str],
        should_generate_images: bool,
        openai_api_key: Optional[str],
        openai_base_url: Optional[str],
    ):
        self.file_state = file_state
        self.image_cache = image_cache
        self.should_generate_images = should_generate_images
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url

    async def execute(self, tool_call: ToolCall) -> ToolExecutionResult:
        if tool_call.name == "create_file":
            return self._create_file(tool_call.arguments)
        if tool_call.name == "edit_file":
            return self._edit_file(tool_call.arguments)
        if tool_call.name == "generate_images":
            return await self._generate_images(tool_call.arguments)
        return ToolExecutionResult(
            ok=False,
            result={"error": f"Unknown tool: {tool_call.name}"},
            summary={"error": f"Unknown tool: {tool_call.name}"},
        )

    def _create_file(self, args: Dict[str, Any]) -> ToolExecutionResult:
        path = _ensure_str(args.get("path") or self.file_state.path or "index.html")
        content = _ensure_str(args.get("content"))
        if not content:
            return ToolExecutionResult(
                ok=False,
                result={"error": "create_file requires non-empty content"},
                summary={"error": "Missing content"},
            )

        extracted = extract_html_content(content)
        self.file_state.path = path
        self.file_state.content = extracted or content

        summary = {
            "path": self.file_state.path,
            "contentLength": len(self.file_state.content),
            "preview": _summarize_text(self.file_state.content, 320),
        }
        result = {
            "path": self.file_state.path,
            "content": self.file_state.content,
        }
        return ToolExecutionResult(
            ok=True,
            result=result,
            summary=summary,
            updated_content=self.file_state.content,
        )

    def _apply_single_edit(
        self, content: str, old_text: str, new_text: str, count: Optional[int]
    ) -> Tuple[str, int]:
        if old_text not in content:
            return content, 0

        if count is None:
            replace_count = 1
        elif count < 0:
            replace_count = content.count(old_text)
        else:
            replace_count = count

        updated = content.replace(old_text, new_text, replace_count)
        return updated, min(replace_count, content.count(old_text))

    def _edit_file(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not self.file_state.content:
            return ToolExecutionResult(
                ok=False,
                result={"error": "No file exists yet. Call create_file first."},
                summary={"error": "No file to edit"},
            )

        edits = args.get("edits")
        if not edits:
            old_text = _ensure_str(args.get("old_text"))
            new_text = _ensure_str(args.get("new_text"))
            count = args.get("count")
            edits = [
                {"old_text": old_text, "new_text": new_text, "count": count}
            ]

        if not isinstance(edits, list):
            return ToolExecutionResult(
                ok=False,
                result={"error": "edits must be a list"},
                summary={"error": "Invalid edits payload"},
            )

        content = self.file_state.content
        summary_edits: List[Dict[str, Any]] = []
        for edit in edits:
            old_text = _ensure_str(edit.get("old_text"))
            new_text = _ensure_str(edit.get("new_text"))
            count = edit.get("count")
            if not old_text:
                return ToolExecutionResult(
                    ok=False,
                    result={"error": "edit_file requires old_text"},
                    summary={"error": "Missing old_text"},
                )

            content, replaced = self._apply_single_edit(
                content, old_text, new_text, count
            )
            if replaced == 0:
                return ToolExecutionResult(
                    ok=False,
                    result={"error": "old_text not found", "old_text": old_text},
                    summary={
                        "error": "old_text not found",
                        "old_text": _summarize_text(old_text, 160),
                    },
                )

            summary_edits.append(
                {
                    "old_text": _summarize_text(old_text, 140),
                    "new_text": _summarize_text(new_text, 140),
                    "replaced": replaced,
                }
            )

        self.file_state.content = content
        summary = {
            "path": self.file_state.path,
            "edits": summary_edits,
            "contentLength": len(self.file_state.content),
        }
        result = {
            "path": self.file_state.path,
            "content": self.file_state.content,
        }
        return ToolExecutionResult(
            ok=True,
            result=result,
            summary=summary,
            updated_content=self.file_state.content,
        )

    async def _generate_images(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not self.should_generate_images:
            return ToolExecutionResult(
                ok=False,
                result={"error": "Image generation is disabled."},
                summary={"error": "Image generation disabled"},
            )

        prompts = args.get("prompts") or []
        if not isinstance(prompts, list) or not prompts:
            return ToolExecutionResult(
                ok=False,
                result={"error": "generate_images requires a non-empty prompts list"},
                summary={"error": "Missing prompts"},
            )

        cleaned = [prompt.strip() for prompt in prompts if isinstance(prompt, str)]
        unique_prompts = list(dict.fromkeys([p for p in cleaned if p]))
        if not unique_prompts:
            return ToolExecutionResult(
                ok=False,
                result={"error": "No valid prompts provided"},
                summary={"error": "No valid prompts"},
            )

        cached_results: Dict[str, Optional[str]] = {}
        to_generate: List[str] = []
        for prompt in unique_prompts:
            if prompt in self.image_cache:
                cached_results[prompt] = self.image_cache[prompt]
            else:
                to_generate.append(prompt)

        generated_results: Dict[str, Optional[str]] = {}

        if to_generate:
            if REPLICATE_API_KEY:
                model = "flux"
                api_key = REPLICATE_API_KEY
                base_url = None
            else:
                if not self.openai_api_key:
                    return ToolExecutionResult(
                        ok=False,
                        result={
                            "error": "No API key available for image generation."
                        },
                        summary={"error": "Missing image generation API key"},
                    )
                model = "dalle3"
                api_key = self.openai_api_key
                base_url = self.openai_base_url

            generated = await process_tasks(to_generate, api_key, base_url, model)  # type: ignore
            for prompt, url in zip(to_generate, generated):
                generated_results[prompt] = url
                if url:
                    self.image_cache[prompt] = url

        merged_results = {**cached_results, **generated_results}
        summary_items = [
            {
                "prompt": _summarize_text(prompt, 160),
                "url": url,
                "status": "ok" if url else "error",
            }
            for prompt, url in merged_results.items()
        ]
        result = {"images": merged_results}
        summary = {"images": summary_items}
        return ToolExecutionResult(ok=True, result=result, summary=summary)


class AgenticRunner:
    def __init__(
        self,
        send_message: Callable[[str, Optional[str], int, Optional[Dict[str, Any]], Optional[str]], Awaitable[None]],
        variant_index: int,
        openai_api_key: Optional[str],
        openai_base_url: Optional[str],
        anthropic_api_key: Optional[str],
        gemini_api_key: Optional[str],
        should_generate_images: bool,
        image_cache: Dict[str, str],
        initial_file_state: Optional[Dict[str, str]] = None,
    ):
        self.send_message = send_message
        self.variant_index = variant_index
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.anthropic_api_key = anthropic_api_key
        self.gemini_api_key = gemini_api_key
        self.should_generate_images = should_generate_images
        self.image_cache = image_cache

        self.file_state = AgentFileState()
        if initial_file_state and initial_file_state.get("content"):
            self.file_state.path = initial_file_state.get("path") or "index.html"
            self.file_state.content = initial_file_state["content"]
        self.toolbox = AgentToolbox(
            self.file_state,
            self.image_cache,
            should_generate_images,
            openai_api_key,
            openai_base_url,
        )
        self.assistant_step = 0
        self.thinking_step = 0

    def _next_event_id(self, prefix: str) -> str:
        return f"{prefix}-{self.variant_index}-{uuid.uuid4().hex[:8]}"

    def _extract_text_content(self, message: ChatCompletionMessageParam) -> str:
        content = message.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    return _ensure_str(part.get("text"))
        return ""

    def _seed_file_state_from_messages(
        self, prompt_messages: List[ChatCompletionMessageParam]
    ) -> None:
        if self.file_state.content:
            return
        for message in reversed(prompt_messages):
            if message.get("role") != "assistant":
                continue
            raw_text = self._extract_text_content(message)
            if not raw_text:
                continue
            extracted = extract_html_content(raw_text)
            self.file_state.content = extracted or raw_text
            if not self.file_state.path:
                self.file_state.path = "index.html"
            return
        if prompt_messages:
            system_message = prompt_messages[0]
            if system_message.get("role") == "system":
                system_text = self._extract_text_content(system_message)
                markers = [
                    "Here is the code of the app:",
                    "Here is the code of the SVG:",
                ]
                for marker in markers:
                    if marker in system_text:
                        raw_text = system_text.split(marker, 1)[1].strip()
                        extracted = extract_html_content(raw_text)
                        self.file_state.content = extracted or raw_text
                        if not self.file_state.path:
                            self.file_state.path = "index.html"
                        return

    async def _send(
        self,
        msg_type: str,
        value: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        event_id: Optional[str] = None,
    ) -> None:
        await self.send_message(msg_type, value, self.variant_index, data, event_id)

    def _summarize_tool_input(self, tool_call: ToolCall) -> Dict[str, Any]:
        args = tool_call.arguments or {}
        if tool_call.name == "create_file":
            content = _ensure_str(args.get("content"))
            return {
                "path": args.get("path") or self.file_state.path,
                "contentLength": len(content),
                "preview": _summarize_text(content, 200),
            }
        if tool_call.name == "edit_file":
            edits = args.get("edits")
            if not edits:
                edits = [
                    {
                        "old_text": args.get("old_text"),
                        "new_text": args.get("new_text"),
                        "count": args.get("count"),
                    }
                ]
            summary_edits = []
            for edit in edits if isinstance(edits, list) else []:
                summary_edits.append(
                    {
                        "old_text": _summarize_text(
                            _ensure_str(edit.get("old_text")), 160
                        ),
                        "new_text": _summarize_text(
                            _ensure_str(edit.get("new_text")), 160
                        ),
                        "count": edit.get("count"),
                    }
                )
            return {
                "path": args.get("path") or self.file_state.path,
                "edits": summary_edits,
            }
        if tool_call.name == "generate_images":
            prompts = args.get("prompts") or []
            if isinstance(prompts, list):
                return {
                    "count": len(prompts),
                    "prompts": [_summarize_text(_ensure_str(p), 140) for p in prompts],
                }
        return args

    def _tool_schemas(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[types.Tool]]:
        create_schema = {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path for the main HTML file. Use index.html if unsure.",
                },
                "content": {
                    "type": "string",
                    "description": "Full HTML for the single-file app.",
                },
            },
            "required": ["content"],
        }
        edit_schema = {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path for the main HTML file.",
                },
                "old_text": {
                    "type": "string",
                    "description": "Exact text to replace. Must match the file contents.",
                },
                "new_text": {
                    "type": "string",
                    "description": "Replacement text.",
                },
                "count": {
                    "type": "integer",
                    "description": "How many occurrences to replace. Use -1 for all.",
                },
                "edits": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "old_text": {"type": "string"},
                            "new_text": {"type": "string"},
                            "count": {"type": "integer"},
                        },
                        "required": ["old_text", "new_text"],
                    },
                },
            },
        }
        image_schema = {
            "type": "object",
            "properties": {
                "prompts": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "description": "Prompt describing a single image to generate.",
                    },
                }
            },
            "required": ["prompts"],
        }

        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": "create_file",
                    "description": "Create the main HTML file for the app. Use exactly once to write the full HTML. Returns the updated file content.",
                    "parameters": create_schema,
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "edit_file",
                    "description": "Edit the main HTML file using exact string replacements. Do not regenerate the entire file. Returns the updated file content.",
                    "parameters": edit_schema,
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_images",
                    "description": "Generate image URLs from prompts. Use to replace placeholder images. You can pass multiple prompts at once.",
                    "parameters": image_schema,
                },
            },
        ]

        anthropic_tools = [
            {
                "name": "create_file",
                "description": "Create the main HTML file for the app. Use exactly once to write the full HTML. Returns the updated file content.",
                "input_schema": create_schema,
            },
            {
                "name": "edit_file",
                "description": "Edit the main HTML file using exact string replacements. Do not regenerate the entire file. Returns the updated file content.",
                "input_schema": edit_schema,
            },
            {
                "name": "generate_images",
                "description": "Generate image URLs from prompts. Use to replace placeholder images. You can pass multiple prompts at once.",
                "input_schema": image_schema,
            },
        ]

        gemini_tools = [
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name="create_file",
                        description="Create the main HTML file for the app. Use exactly once to write the full HTML. Returns the updated file content.",
                        parameters_json_schema=create_schema,
                    ),
                    types.FunctionDeclaration(
                        name="edit_file",
                        description="Edit the main HTML file using exact string replacements. Do not regenerate the entire file. Returns the updated file content.",
                        parameters_json_schema=edit_schema,
                    ),
                    types.FunctionDeclaration(
                        name="generate_images",
                        description="Generate image URLs from prompts. Use to replace placeholder images. You can pass multiple prompts at once.",
                        parameters_json_schema=image_schema,
                    ),
                ]
            )
        ]

        return openai_tools, anthropic_tools, gemini_tools

    async def run(self, model: Llm, prompt_messages: List[ChatCompletionMessageParam]) -> str:
        self._seed_file_state_from_messages(prompt_messages)
        if model in OPENAI_MODELS:
            return await self._run_openai(model, prompt_messages)
        if model in ANTHROPIC_MODELS:
            return await self._run_anthropic(model, prompt_messages)
        if model in GEMINI_MODELS:
            return await self._run_gemini(model, prompt_messages)
        raise ValueError(f"Unsupported model: {model.value}")

    async def _run_openai(
        self, model: Llm, prompt_messages: List[ChatCompletionMessageParam]
    ) -> str:
        if not self.openai_api_key:
            raise Exception("OpenAI API key is missing.")

        client = AsyncOpenAI(api_key=self.openai_api_key, base_url=self.openai_base_url)
        openai_tools, _, _ = self._tool_schemas()
        messages: List[Dict[str, Any]] = [dict(m) for m in prompt_messages]

        max_steps = 8
        try:
            for _ in range(max_steps):
                assistant_event_id = self._next_event_id("assistant")
                assistant_text = ""
                tool_calls: Dict[int, Dict[str, Any]] = {}
                started_tool_ids: set[str] = set()

                params: Dict[str, Any] = {
                    "model": model.value,
                    "messages": messages,
                    "tools": openai_tools,
                    "tool_choice": "auto",
                    "temperature": 0,
                    "stream": True,
                }
                if model.value == "gpt-5.2-2025-12-11":
                    params["max_completion_tokens"] = 30000
                else:
                    params["max_tokens"] = 30000

                stream = await client.chat.completions.create(**params)

                async for chunk in stream:  # type: ignore
                    assert isinstance(chunk, ChatCompletionChunk)
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if delta.content:
                        assistant_text += delta.content
                        await self._send(
                            "assistant", delta.content, event_id=assistant_event_id
                        )
                    if delta.tool_calls:
                        for tc in delta.tool_calls:
                            idx = tc.index or 0
                            entry = tool_calls.setdefault(
                                idx,
                                {
                                    "id": tc.id or f"tool-{idx}-{uuid.uuid4().hex[:6]}",
                                    "name": None,
                                    "arguments": "",
                                    "started": False,
                                    "last_len": 0,
                                },
                            )
                            if tc.id:
                                entry["id"] = tc.id
                            if tc.function and tc.function.name:
                                entry["name"] = tc.function.name
                            if tc.function and tc.function.arguments:
                                entry["arguments"] += tc.function.arguments
                            if entry.get("name") == "create_file":
                                content = _extract_content_from_args(entry.get("arguments"))
                                if content is not None:
                                    if not entry["started"]:
                                        path = (
                                            _extract_path_from_args(entry.get("arguments"))
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
                                                    "preview": _summarize_text(content, 200),
                                                },
                                            },
                                            event_id=entry["id"],
                                        )
                                        entry["started"] = True
                                        started_tool_ids.add(entry["id"])
                                    if entry["last_len"] == 0 and content:
                                        entry["last_len"] = len(content)
                                        await self._send("setCode", content)
                                    elif len(content) - entry["last_len"] >= 40:
                                        entry["last_len"] = len(content)
                                        await self._send("setCode", content)

                tool_call_list: List[ToolCall] = []
                for entry in tool_calls.values():
                    args, error = _parse_json_arguments(entry.get("arguments"))
                    if error:
                        args = {"_raw": entry.get("arguments")}
                    tool_call_list.append(
                        ToolCall(
                            id=entry["id"],
                            name=entry.get("name") or "unknown_tool",
                            arguments=args,
                        )
                    )

                if not tool_call_list:
                    return await self._finalize_response(assistant_text)

                assistant_message = {
                    "role": "assistant",
                    "content": assistant_text or None,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.name,
                                "arguments": json.dumps(tc.arguments),
                            },
                        }
                        for tc in tool_call_list
                    ],
                }
                messages.append(assistant_message)

                for tool_call in tool_call_list:
                    tool_event_id = tool_call.id or self._next_event_id("tool")
                    if tool_event_id not in started_tool_ids:
                        await self._send(
                            "toolStart",
                            data={
                                "name": tool_call.name,
                                "input": self._summarize_tool_input(tool_call),
                            },
                            event_id=tool_event_id,
                        )
                    if tool_call.name == "create_file" and tool_event_id not in started_tool_ids:
                        content = _extract_content_from_args(tool_call.arguments)
                        if content:
                            await self._send("setCode", content)
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

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(tool_result.result),
                        }
                    )

            raise Exception("Agent exceeded max tool turns")
        finally:
            await client.close()

    async def _run_anthropic(
        self, model: Llm, prompt_messages: List[ChatCompletionMessageParam]
    ) -> str:
        if not self.anthropic_api_key:
            raise Exception("Anthropic API key is missing.")

        from models.claude import convert_openai_messages_to_claude

        system_prompt, claude_messages = convert_openai_messages_to_claude(
            prompt_messages
        )
        client = AsyncAnthropic(api_key=self.anthropic_api_key)
        _, anthropic_tools, _ = self._tool_schemas()

        max_steps = 8
        try:
            for _ in range(max_steps):
                assistant_event_id = self._next_event_id("assistant")
                thinking_event_id = self._next_event_id("thinking")
                assistant_text = ""

                thinking_models = [
                    Llm.CLAUDE_4_5_SONNET_2025_09_29.value,
                    Llm.CLAUDE_4_5_OPUS_2025_11_01.value,
                ]

                stream_kwargs: Dict[str, Any] = {
                    "model": model.value,
                    "max_tokens": 30000,
                    "system": system_prompt,
                    "messages": claude_messages,
                    "tools": anthropic_tools,
                }

                if model.value in thinking_models:
                    stream_kwargs["thinking"] = {
                        "type": "enabled",
                        "budget_tokens": 10000,
                    }
                else:
                    stream_kwargs["temperature"] = 0.0

                async with client.messages.stream(**stream_kwargs) as stream:
                    async for event in stream:
                        if event.type == "content_block_delta":
                            if event.delta.type == "thinking_delta":
                                await self._send(
                                    "thinking",
                                    event.delta.thinking,
                                    event_id=thinking_event_id,
                                )
                            elif event.delta.type == "text_delta":
                                assistant_text += event.delta.text
                                await self._send(
                                    "assistant",
                                    event.delta.text,
                                    event_id=assistant_event_id,
                                )

                    final_message = await stream.get_final_message()

                tool_calls: List[ToolCall] = []
                if final_message and final_message.content:
                    for block in final_message.content:
                        if block.type == "tool_use":
                            tool_calls.append(
                                ToolCall(
                                    id=block.id,
                                    name=block.name,
                                    arguments=block.input,
                                )
                            )

                if not tool_calls:
                    return await self._finalize_response(assistant_text)

                assistant_blocks: List[Dict[str, Any]] = []
                if assistant_text:
                    assistant_blocks.append({"type": "text", "text": assistant_text})
                for call in tool_calls:
                    assistant_blocks.append(
                        {
                            "type": "tool_use",
                            "id": call.id,
                            "name": call.name,
                            "input": call.arguments,
                        }
                    )

                claude_messages.append({"role": "assistant", "content": assistant_blocks})

                tool_result_blocks: List[Dict[str, Any]] = []
                for tool_call in tool_calls:
                    tool_event_id = tool_call.id or self._next_event_id("tool")
                    await self._send(
                        "toolStart",
                        data={
                            "name": tool_call.name,
                            "input": self._summarize_tool_input(tool_call),
                        },
                        event_id=tool_event_id,
                    )
                    if tool_call.name == "create_file":
                        content = _extract_content_from_args(tool_call.arguments)
                        if content:
                            await self._send("setCode", content)
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

                    tool_result_blocks.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_call.id,
                            "content": json.dumps(tool_result.result),
                            "is_error": not tool_result.ok,
                        }
                    )

                claude_messages.append({"role": "user", "content": tool_result_blocks})

            raise Exception("Agent exceeded max tool turns")
        finally:
            await client.close()

    async def _run_gemini(
        self, model: Llm, prompt_messages: List[ChatCompletionMessageParam]
    ) -> str:
        if not self.gemini_api_key:
            raise Exception("Gemini API key is missing.")

        from models.gemini import (
            convert_message_to_gemini_content,
            get_gemini_api_model_name,
            get_thinking_level_for_model,
        )

        system_prompt = str(prompt_messages[0].get("content", ""))
        gemini_contents: List[types.Content] = [
            convert_message_to_gemini_content(msg) for msg in prompt_messages[1:]
        ]

        _, _, gemini_tools = self._tool_schemas()
        client = genai.Client(api_key=self.gemini_api_key)

        max_steps = 8
        for _ in range(max_steps):
            assistant_event_id = self._next_event_id("assistant")
            thinking_event_id = self._next_event_id("thinking")
            assistant_text = ""
            tool_calls: List[ToolCall] = []
            function_call_parts: List[types.Part] = []
            tool_stream_state: Dict[str, Dict[str, Any]] = {}
            started_tool_ids: set[str] = set()

            thinking_level = get_thinking_level_for_model(model)
            config = types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=30000,
                system_instruction=system_prompt,
                thinking_config=types.ThinkingConfig(
                    thinking_level=thinking_level, include_thoughts=True
                ),
                tools=gemini_tools,
            )

            api_model_name = get_gemini_api_model_name(model)

            async for chunk in await client.aio.models.generate_content_stream(
                model=api_model_name,
                contents=gemini_contents,
                config=config,
            ):
                if not chunk.candidates:
                    continue
                for part in chunk.candidates[0].content.parts:
                    if getattr(part, "thought", False) and part.text:
                        await self._send(
                            "thinking", part.text, event_id=thinking_event_id
                        )
                        continue
                    if part.function_call:
                        function_call_parts.append(part)
                        args = part.function_call.args or {}
                        tool_id = part.function_call.id or f"tool-{uuid.uuid4().hex[:6]}"
                        tool_name = part.function_call.name or "unknown_tool"
                        if tool_name == "create_file":
                            content = _extract_content_from_args(args)
                            if content is not None:
                                state = tool_stream_state.setdefault(
                                    tool_id, {"started": False, "last_len": 0}
                                )
                                if not state["started"]:
                                    path = (
                                        _extract_path_from_args(args)
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
                                                "preview": _summarize_text(
                                                    content, 200
                                                ),
                                            },
                                        },
                                        event_id=tool_id,
                                    )
                                    state["started"] = True
                                    started_tool_ids.add(tool_id)
                                if state["last_len"] == 0 and content:
                                    state["last_len"] = len(content)
                                    await self._send("setCode", content)
                                elif len(content) - state["last_len"] >= 40:
                                    state["last_len"] = len(content)
                                    await self._send("setCode", content)
                        tool_calls.append(
                            ToolCall(
                                id=tool_id,
                                name=tool_name,
                                arguments=args,
                            )
                        )
                        continue
                    if part.text:
                        assistant_text += part.text
                        await self._send(
                            "assistant", part.text, event_id=assistant_event_id
                        )

            if not tool_calls:
                return await self._finalize_response(assistant_text)

            model_parts: List[Any] = []
            if assistant_text:
                model_parts.append({"text": assistant_text})  # type: ignore
            model_parts.extend(function_call_parts)

            model_content = types.Content(role="model", parts=model_parts)
            gemini_contents.append(model_content)

            tool_result_parts: List[types.Part] = []
            for tool_call in tool_calls:
                tool_event_id = tool_call.id or self._next_event_id("tool")
                if tool_event_id not in started_tool_ids:
                    await self._send(
                        "toolStart",
                        data={
                            "name": tool_call.name,
                            "input": self._summarize_tool_input(tool_call),
                        },
                        event_id=tool_event_id,
                    )
                if tool_call.name == "create_file" and tool_event_id not in started_tool_ids:
                    content = _extract_content_from_args(tool_call.arguments)
                    if content:
                        await self._send("setCode", content)
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

                tool_result_parts.append(
                    types.Part.from_function_response(
                        name=tool_call.name, response=tool_result.result
                    )
                )

            gemini_contents.append(types.Content(role="tool", parts=tool_result_parts))

        raise Exception("Agent exceeded max tool turns")

    async def _finalize_response(self, assistant_text: str) -> str:
        if self.file_state.content:
            return self.file_state.content

        html = extract_html_content(assistant_text)
        if html:
            self.file_state.content = html
            await self._send("setCode", html)
        return self.file_state.content
