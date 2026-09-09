# pyright: reportUnknownVariableType=false
import base64
import json
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import EventSink, ExecutedToolCall, ProviderSession, ProviderTurn, StreamEvent
from agent.state import ensure_str
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments
from costs.token_usage import TokenUsage
from fs_logging.agent_runs import AgentRunRecorder
from fs_logging.prompt_reports import PromptReportLogger
from llm import Llm, get_openai_api_name


def _chat_tools(tools: List[CanonicalToolDefinition]) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    for tool in tools:
        result.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
            },
        })
    return result


def _message_content(message: ChatCompletionMessageParam) -> Any:
    content = message.get("content", "")
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return content
    converted: List[Dict[str, Any]] = []
    for part in content:
        if not isinstance(part, dict):
            continue
        if part.get("type") == "text":
            converted.append({"type": "text", "text": part.get("text", "")})
        elif part.get("type") == "image_url":
            converted.append({"type": "image_url", "image_url": part.get("image_url", {})})
    return converted


def _image_data_url(part: Any) -> Optional[str]:
    image_url = getattr(part, "image_url", None)
    if image_url:
        return image_url
    data = getattr(part, "data", None)
    mime_type = getattr(part, "mime_type", None)
    if data is not None and mime_type:
        return f"data:{mime_type};base64,{base64.b64encode(data).decode('ascii')}"
    return None


class RouterProviderSession(ProviderSession):
    def __init__(
        self,
        client: AsyncOpenAI,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[CanonicalToolDefinition],
        recorder: Optional[AgentRunRecorder] = None,
    ):
        self._client = client
        self._model = model
        self._messages: List[Dict[str, Any]] = [
            {"role": message.get("role", "user"), "content": _message_content(message)}
            for message in prompt_messages
        ]
        self._tools = _chat_tools(tools)
        self._recorder = recorder
        self._usage = TokenUsage()
        self._logger = PromptReportLogger(
            provider="9router",
            model=model,
            api_model_name=get_openai_api_name(model),
        )

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        model_name = get_openai_api_name(self._model)
        params: Dict[str, Any] = {
            "model": model_name,
            "messages": self._messages,
            "tools": self._tools,
            "tool_choice": "auto",
            "stream": True,
            "max_tokens": 50000,
            "stream_options": {"include_usage": True},
        }
        self._logger.record_request(params)
        if self._recorder is not None:
            self._recorder.record_llm_request("9router", model_name, params)

        stream = await self._client.chat.completions.create(**params)  # type: ignore
        assistant_text = ""
        calls: Dict[int, Dict[str, Any]] = {}
        usage: Any = None

        async for chunk in stream:
            usage = getattr(chunk, "usage", None) or usage
            choices = getattr(chunk, "choices", []) or []
            if not choices:
                continue
            delta = choices[0].delta
            text = getattr(delta, "content", None)
            if text:
                assistant_text += text
                await on_event(StreamEvent(type="assistant_delta", text=text))

            tool_deltas = getattr(delta, "tool_calls", None) or []
            for tool_delta in tool_deltas:
                index = getattr(tool_delta, "index", 0)
                entry = calls.setdefault(index, {"id": "", "name": "", "arguments": ""})
                call_id = getattr(tool_delta, "id", None)
                if call_id:
                    entry["id"] = call_id
                function = getattr(tool_delta, "function", None)
                if function:
                    name = getattr(function, "name", None)
                    if name:
                        entry["name"] = name
                    arguments = getattr(function, "arguments", None)
                    if arguments:
                        entry["arguments"] += arguments
                await on_event(StreamEvent(
                    type="tool_call_delta",
                    tool_call_id=entry["id"] or f"router-call-{index}",
                    tool_name=entry["name"] or None,
                    tool_arguments=entry["arguments"],
                ))

        if usage is not None:
            input_tokens = getattr(usage, "prompt_tokens", 0) or 0
            output_tokens = getattr(usage, "completion_tokens", 0) or 0
            total_tokens = getattr(usage, "total_tokens", input_tokens + output_tokens) or 0
            turn_usage = TokenUsage(input=input_tokens, output=output_tokens, total=total_tokens)
            self._usage.accumulate(turn_usage)
            self._logger.record_usage(turn_usage)
        else:
            turn_usage = None

        tool_calls: List[ToolCall] = []
        assistant_message: Dict[str, Any] = {"role": "assistant", "content": assistant_text or None}
        if calls:
            serialized_calls = []
            for index in sorted(calls):
                entry = calls[index]
                call_id = entry["id"] or f"router-call-{index}"
                serialized_calls.append({
                    "id": call_id,
                    "type": "function",
                    "function": {"name": entry["name"], "arguments": entry["arguments"]},
                })
                args, error = parse_json_arguments(entry["arguments"])
                if error:
                    args = {"INVALID_JSON": ensure_str(entry["arguments"])}
                tool_calls.append(ToolCall(id=call_id, name=entry["name"], arguments=args))
            assistant_message["tool_calls"] = serialized_calls
        self._messages.append(assistant_message)

        turn = ProviderTurn(
            assistant_text=assistant_text,
            tool_calls=tool_calls,
            assistant_turn=assistant_message,
        )
        if self._recorder is not None:
            self._recorder.record_llm_response(assistant_text, tool_calls, turn_usage)
        return turn

    async def append_tool_results(self, turn: ProviderTurn, executed_tool_calls: list[ExecutedToolCall]) -> None:
        for executed in executed_tool_calls:
            result_json = json.dumps(executed.result.result)
            self._messages.append({
                "role": "tool",
                "tool_call_id": executed.tool_call.id,
                "content": result_json,
            })

            # Chat Completions tool messages are text-oriented. For tools that
            # return screenshots/crops, attach those images as a follow-up user
            # message so vision-capable router models can inspect them.
            image_parts: List[Dict[str, Any]] = []
            for part in executed.result.multimodal_parts or []:
                image_url = _image_data_url(part)
                if image_url:
                    image_parts.append({"type": "image_url", "image_url": {"url": image_url, "detail": "high"}})
            if image_parts:
                self._messages.append({
                    "role": "user",
                    "content": [{"type": "text", "text": "Here are the images returned by the tool. Inspect them and continue."}, *image_parts],
                })

    def total_cost_usd(self) -> float | None:
        # Router model pricing varies by upstream provider and is not known to
        # this application. Return None so the engine does not invent a cost.
        return None

    async def close(self) -> None:
        print(
            f"[TOKEN USAGE] provider=9router model={get_openai_api_name(self._model)} | "
            f"input={self._usage.input} output={self._usage.output} total={self._usage.total}"
        )
        await self._client.close()
