import time
from typing import Awaitable, Callable, List, Any, Dict
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk
from llm import Completion, Llm, get_openai_api_name, get_openai_reasoning_effort, OPENAI_CODEX_MODELS


def _convert_message_to_responses_input(
    message: ChatCompletionMessageParam,
) -> Dict[str, Any]:
    role = message.get("role", "user")
    content = message.get("content", "")

    if isinstance(content, str):
        return {"role": role, "content": content}

    parts: List[Dict[str, Any]] = []
    if isinstance(content, list):
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "text":
                parts.append({"type": "input_text", "text": part.get("text", "")})
            elif part.get("type") == "image_url":
                image_url = part.get("image_url", {})
                parts.append(
                    {
                        "type": "input_image",
                        "image_url": image_url.get("url", ""),
                        "detail": image_url.get("detail", "auto"),
                    }
                )

    return {"role": role, "content": parts}


async def stream_openai_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    base_url: str | None,
    callback: Callable[[str], Awaitable[None]],
    model: Llm,
) -> Completion:
    start_time = time.time()
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    full_response = ""
    if model in OPENAI_CODEX_MODELS:
        input_items = [_convert_message_to_responses_input(msg) for msg in messages]
        reasoning_effort = get_openai_reasoning_effort(model)
        params: Dict[str, Any] = {
            "model": get_openai_api_name(model),
            "input": input_items,
            "stream": True,
            "max_output_tokens": 30000,
        }
        if reasoning_effort:
            params["reasoning"] = {"effort": reasoning_effort}

        responses_client = getattr(client, "responses", None)
        if responses_client is None:
            raise Exception(
                "OpenAI SDK is too old for GPT-5.2 Codex. Please upgrade the 'openai' package to a version that supports the Responses API."
            )
        stream = await responses_client.create(**params)  # type: ignore
        async for event in stream:  # type: ignore
            event_type = getattr(event, "type", None)
            if event_type is None and isinstance(event, dict):
                event_type = event.get("type")
            if event_type == "response.output_text.delta":
                delta = getattr(event, "delta", None)
                if delta is None and isinstance(event, dict):
                    delta = event.get("delta", "")
                if not delta:
                    continue
                full_response += delta
                await callback(delta)
    else:
        # Base parameters
        params = {
            "model": get_openai_api_name(model),
            "messages": messages,
            "timeout": 600,
        }

        params["temperature"] = 0
        params["stream"] = True
        params["max_tokens"] = 30000

        stream = await client.chat.completions.create(**params)  # type: ignore
        async for chunk in stream:  # type: ignore
            assert isinstance(chunk, ChatCompletionChunk)
            if (
                chunk.choices
                and len(chunk.choices) > 0
                and chunk.choices[0].delta
                and chunk.choices[0].delta.content
            ):
                content = chunk.choices[0].delta.content or ""
                full_response += content
                await callback(content)

    await client.close()

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}
