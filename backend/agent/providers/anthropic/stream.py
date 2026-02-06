from typing import Any, Dict, List

from anthropic import AsyncAnthropic

from llm import Llm


THINKING_MODELS = {
    Llm.CLAUDE_4_5_SONNET_2025_09_29.value,
    Llm.CLAUDE_4_5_OPUS_2025_11_01.value,
}


def create_stream_context(
    client: AsyncAnthropic,
    model: Llm,
    system_prompt: str,
    messages: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
) -> Any:
    stream_kwargs: Dict[str, Any] = {
        "model": model.value,
        "max_tokens": 30000,
        "system": system_prompt,
        "messages": messages,
        "tools": tools,
    }

    if model.value in THINKING_MODELS:
        stream_kwargs["thinking"] = {
            "type": "enabled",
            "budget_tokens": 10000,
        }
    else:
        stream_kwargs["temperature"] = 0.0

    if hasattr(client, "beta") and hasattr(client.beta, "messages"):
        stream_client = client.beta.messages
    else:
        stream_client = client.messages

    try:
        stream_kwargs_with_betas = dict(stream_kwargs)
        stream_kwargs_with_betas["betas"] = ["fine-grained-tool-streaming-2025-05-14"]
        return stream_client.stream(**stream_kwargs_with_betas)
    except TypeError:
        return stream_client.stream(**stream_kwargs)
