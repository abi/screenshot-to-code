import base64
import io
from typing import Any, List, cast

import pytest
from openai.types.chat import ChatCompletionMessageParam
from PIL import Image

from agent.providers.anthropic.image import CLAUDE_MANY_IMAGE_MAX_DIMENSION
from agent.providers.anthropic.provider import AnthropicProviderSession
from agent.providers.base import ExecutedToolCall, ProviderTurn
from agent.tools.types import ToolCall, ToolExecutionResult, ToolMultimodalPart
from llm import Llm


def _png_bytes(width: int, height: int) -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (width, height), "white").save(output, format="PNG")
    return output.getvalue()


def _data_url(image_bytes: bytes) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _prompt_messages(image_count: int) -> List[ChatCompletionMessageParam]:
    oversized = _data_url(_png_bytes(2100, 100))
    small = _data_url(_png_bytes(1, 1))
    content: list[dict[str, Any]] = [
        {
            "type": "image_url",
            "image_url": {
                "url": oversized if index == 0 else small,
                "detail": "high",
            },
        }
        for index in range(image_count)
    ]
    content.append({"type": "text", "text": "Build this page"})
    return cast(
        List[ChatCompletionMessageParam],
        [
            {"role": "system", "content": "system"},
            {"role": "user", "content": content},
        ],
    )


def _image_dimensions(source: dict[str, Any]) -> tuple[int, int]:
    image_bytes = base64.b64decode(source["data"])
    with Image.open(io.BytesIO(image_bytes)) as image:
        return image.size


def _session(image_count: int) -> AnthropicProviderSession:
    return AnthropicProviderSession(
        client=object(),  # type: ignore[arg-type]
        model=Llm.CLAUDE_FABLE_5_HIGH,
        prompt_messages=_prompt_messages(image_count),
        tools=[],
    )


def _first_prompt_image_source(session: AnthropicProviderSession) -> dict[str, Any]:
    content = session._messages[0]["content"]
    assert isinstance(content, list)
    first_image = cast(dict[str, Any], content[0])
    source = first_image["source"]
    assert isinstance(source, dict)
    return cast(dict[str, Any], source)


def _executed_image(image_bytes: bytes, call_id: str) -> ExecutedToolCall:
    return ExecutedToolCall(
        tool_call=ToolCall(id=call_id, name="screenshot_preview", arguments={}),
        result=ToolExecutionResult(
            ok=True,
            result={"status": "ok"},
            summary={},
            multimodal_parts=[
                ToolMultimodalPart(
                    display_name="preview.png",
                    mime_type="image/png",
                    data=image_bytes,
                )
            ],
        ),
    )


@pytest.mark.parametrize(
    ("image_count", "expected_width"),
    [
        (20, 2100),
        (21, CLAUDE_MANY_IMAGE_MAX_DIMENSION),
    ],
)
def test_initial_request_uses_stricter_limit_only_above_twenty_images(
    image_count: int,
    expected_width: int,
) -> None:
    session = _session(image_count)

    assert _image_dimensions(_first_prompt_image_source(session))[0] == expected_width


@pytest.mark.asyncio
async def test_crossing_limit_with_tool_images_resizes_history_and_future_images() -> None:
    session = _session(20)
    assert _image_dimensions(_first_prompt_image_source(session))[0] == 2100

    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=None),
        [_executed_image(_png_bytes(1, 1), "call-1")],
    )

    assert session._many_image_limit_active is True
    assert (
        _image_dimensions(_first_prompt_image_source(session))[0]
        == CLAUDE_MANY_IMAGE_MAX_DIMENSION
    )

    await session.append_tool_results(
        ProviderTurn(assistant_text="", tool_calls=[], assistant_turn=None),
        [_executed_image(_png_bytes(2200, 100), "call-2")],
    )
    latest_tool_results = session._messages[-1]["content"]
    assert isinstance(latest_tool_results, list)
    tool_result = cast(dict[str, Any], latest_tool_results[0])
    latest_content = tool_result["content"]
    assert isinstance(latest_content, list)
    image_blocks = cast(list[dict[str, Any]], latest_content)
    latest_image = next(block for block in image_blocks if block["type"] == "image")

    assert (
        _image_dimensions(latest_image["source"])[0]
        == CLAUDE_MANY_IMAGE_MAX_DIMENSION
    )
