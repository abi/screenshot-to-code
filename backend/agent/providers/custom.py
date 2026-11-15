"""
CustomOpenAIProviderSession
===========================
Drives any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, LiteLLM,
Groq, Together, OpenRouter …) using the standard **Chat Completions** streaming
API (POST /v1/chat/completions).

Why not reuse OpenAIProviderSession?
- The built-in OpenAI session uses the *Responses* API
  (client.responses.create) which almost no third-party server implements.
- Custom model names are plain strings, not Llm enum values, so look-ups for
  api_name / reasoning_effort don't apply here.
"""

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai import APIConnectionError, APIError, AsyncOpenAI, AuthenticationError, RateLimitError
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderSession,
    ProviderTurn,
    StreamEvent,
)
from agent.tools import CanonicalToolDefinition, ToolCall, parse_json_arguments


# ---------------------------------------------------------------------------
# Tool serialization (Chat Completions format)
# ---------------------------------------------------------------------------

def serialize_custom_tools(tools: List[CanonicalToolDefinition]) -> List[Dict[str, Any]]:
    """Serialize tools into the standard OpenAI chat-completions function format."""
    serialized: List[Dict[str, Any]] = []
    for tool in tools:
        serialized.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
        )
    return serialized


# ---------------------------------------------------------------------------
# Streaming parse state
# ---------------------------------------------------------------------------

@dataclass
class _ChatCompletionsParseState:
    assistant_text: str = ""
    # call_id -> {"id": str, "name": str, "arguments": str}
    tool_calls: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    # index -> call_id (for delta accumulation)
    index_to_id: Dict[int, str] = field(default_factory=dict)


def _build_chat_provider_turn(
    state: _ChatCompletionsParseState,
    raw_messages: List[Dict[str, Any]],
) -> ProviderTurn:
    tool_calls: List[ToolCall] = []
    for entry in state.tool_calls.values():
        args, _err = parse_json_arguments(entry.get("arguments"))
        if _err:
            args = {"INVALID_JSON": str(entry.get("arguments", ""))}
        tool_calls.append(
            ToolCall(
                id=entry.get("id") or f"call-{uuid.uuid4().hex[:6]}",
                name=entry.get("name") or "unknown_tool",
                arguments=args,
            )
        )

    # assistant_turn carries the raw message dict for history replay
    return ProviderTurn(
        assistant_text=state.assistant_text,
        tool_calls=tool_calls,
        assistant_turn=raw_messages,
    )


# ---------------------------------------------------------------------------
# Provider session
# ---------------------------------------------------------------------------

class CustomOpenAIProviderSession(ProviderSession):
    """
    A ProviderSession backed by any OpenAI-compatible HTTP server.

    Parameters
    ----------
    client:     AsyncOpenAI configured with custom base_url / api_key.
    model_id:   Raw model name string (e.g. "llama3.2", "mistral-7b-instruct").
    prompt_messages: Initial conversation history.
    tools:      Serialized chat-completions tool definitions.
    """

    def __init__(
        self,
        client: AsyncOpenAI,
        model_id: str,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ):
        self._client = client
        self._model_id = model_id
        self._tools = tools
        # Mutable conversation history — we append assistant + tool results each turn
        self._messages: List[Dict[str, Any]] = [
            dict(m) for m in prompt_messages  # type: ignore[arg-type]
        ]

    # ------------------------------------------------------------------
    # stream_turn
    # ------------------------------------------------------------------

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        state = _ChatCompletionsParseState()

        params: Dict[str, Any] = {
            "model": self._model_id,
            "messages": self._messages,
            "stream": True,
        }
        if self._tools:
            params["tools"] = self._tools
            params["tool_choice"] = "auto"

        # Collect the full assistant message for history
        assistant_message: Dict[str, Any] = {"role": "assistant", "content": ""}
        # tool_calls accumulator keyed by index (for streaming deltas)
        streaming_calls: Dict[int, Dict[str, Any]] = {}

        stream = None
        for attempt in range(4):
            try:
                stream = await self._client.chat.completions.create(**params)  # type: ignore[call-overload]
                break
            except RateLimitError as e:
                if attempt == 3:
                    raise Exception(f"Custom provider rate limit reached (429): {e.message}. Please wait a moment before retrying.") from e
                print(f"[CUSTOM PROVIDER] Rate limited (429), waiting {(attempt + 1) * 3}s before retry (attempt {attempt + 2}/4)...")
                await asyncio.sleep((attempt + 1) * 3)
            except AuthenticationError as e:
                raise Exception(f"Custom provider authentication failed: {e.message}. Please check your API key in Settings.") from e
            except APIConnectionError as e:
                if attempt < 3:
                    await asyncio.sleep(2)
                    continue
                raise Exception(f"Could not connect to custom provider: {e.message}") from e
            except APIError as e:
                err_code = str(getattr(e, "code", "") or "")
                if err_code == "429" or "rate" in str(e.message).lower():
                    if attempt == 3:
                        raise Exception(f"Custom provider rate limit reached (429): {e.message}") from e
                    print(f"[CUSTOM PROVIDER] Rate limit error ({err_code}), waiting {(attempt + 1) * 3}s before retry...")
                    await asyncio.sleep((attempt + 1) * 3)
                    continue
                raise Exception(f"Custom provider error ({e.code}): {e.message}") from e

        if stream is None:
            raise Exception("Failed to establish stream with custom provider after retries.")

        async for chunk in stream:  # type: ignore[union-attr]
            choices = getattr(chunk, "choices", None) or []
            if not choices:
                continue
            delta = getattr(choices[0], "delta", None)
            if delta is None:
                continue

            # --- assistant text ---
            text_delta: Optional[str] = getattr(delta, "content", None)
            if text_delta:
                state.assistant_text += text_delta
                await on_event(StreamEvent(type="assistant_delta", text=text_delta))

            # --- tool call deltas ---
            tc_deltas = getattr(delta, "tool_calls", None) or []
            for tc_delta in tc_deltas:
                idx: int = tc_delta.index if hasattr(tc_delta, "index") else 0
                if idx not in streaming_calls:
                    streaming_calls[idx] = {
                        "id": getattr(tc_delta, "id", None) or f"call-{uuid.uuid4().hex[:6]}",
                        "name": "",
                        "arguments": "",
                    }
                entry = streaming_calls[idx]

                fn = getattr(tc_delta, "function", None)
                if fn:
                    name_part: Optional[str] = getattr(fn, "name", None)
                    args_part: Optional[str] = getattr(fn, "arguments", None)
                    if name_part:
                        entry["name"] += name_part
                    if args_part:
                        entry["arguments"] += args_part

                # Emit streaming delta so the engine can stream code preview
                call_id: str = entry["id"]
                await on_event(
                    StreamEvent(
                        type="tool_call_delta",
                        tool_call_id=call_id,
                        tool_name=entry["name"] or None,
                        tool_arguments=entry["arguments"] or None,
                    )
                )

        # Finalise tool calls into the state dict
        for entry in streaming_calls.values():
            call_id = entry["id"]
            state.tool_calls[call_id] = entry

        # Build the raw assistant message dict for history
        assistant_message["content"] = state.assistant_text or ""
        if state.tool_calls:
            raw_tc = [
                {
                    "id": e["id"],
                    "type": "function",
                    "function": {
                        "name": e["name"],
                        "arguments": e["arguments"],
                    },
                }
                for e in state.tool_calls.values()
            ]
            assistant_message["tool_calls"] = raw_tc

        return _build_chat_provider_turn(state, [assistant_message])

    # ------------------------------------------------------------------
    # append_tool_results
    # ------------------------------------------------------------------

    async def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: List[ExecutedToolCall],
    ) -> None:
        # Append the assistant turn to history
        assistant_msgs: List[Dict[str, Any]] = turn.assistant_turn or []
        self._messages.extend(assistant_msgs)

        # Append each tool result
        for executed in executed_tool_calls:
            result_text = json.dumps(executed.result.result)
            self._messages.append(
                {
                    "role": "tool",
                    "tool_call_id": executed.tool_call.id,
                    "content": result_text,
                }
            )

    # ------------------------------------------------------------------
    # close
    # ------------------------------------------------------------------

    async def close(self) -> None:
        print(
            f"[TOKEN USAGE] provider=custom model={self._model_id} "
            "(token counts not available for custom providers)"
        )
        await self._client.close()
