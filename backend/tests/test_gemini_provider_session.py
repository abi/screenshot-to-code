from typing import Any, cast

import pytest
from google.genai import types

from agent.providers.base import ExecutedToolCall, ProviderTurn
from agent.providers.gemini import GeminiProviderSession
from agent.tools.types import ToolCall, ToolExecutionResult, ToolMultimodalPart
from llm import Llm


@pytest.mark.asyncio
async def test_gemini_provider_appends_multimodal_function_response_parts() -> None:
    session = GeminiProviderSession(
        client=object(),  # type: ignore[arg-type]
        model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
        prompt_messages=[
            {"role": "system", "content": "You are helpful."},
            {"role": "user", "content": "Extract the logo."},
        ],
        tools=[],
    )
    model_turn = types.Content(
        role="model",
        parts=[
            types.Part.from_function_call(
                name="extract_assets",
                args={"asset_descriptions": ["logo"]},
            )
        ],
    )

    await session.append_tool_results(
        ProviderTurn(
            assistant_text="",
            tool_calls=[],
            assistant_turn=model_turn,
        ),
        [
            ExecutedToolCall(
                tool_call=ToolCall(
                    id="call-1",
                    name="extract_assets",
                    arguments={"asset_descriptions": ["logo"]},
                ),
                result=ToolExecutionResult(
                    ok=True,
                    result={
                        "assets": [
                            {
                                "description": "logo",
                                "image_part_index": 0,
                                "image_display_name": "asset_0.png",
                            }
                        ]
                    },
                    summary={},
                    multimodal_parts=[
                        ToolMultimodalPart(
                            display_name="asset_0.png",
                            mime_type="image/png",
                            data=b"logo-image",
                        )
                    ],
                ),
            )
        ],
    )

    contents: list[types.Content] = session._contents  # type: ignore[attr-defined]
    tool_response_content = contents[-1]
    assert tool_response_content.parts is not None
    function_response = tool_response_content.parts[0].function_response
    assert tool_response_content.role == "user"
    assert function_response is not None
    assert function_response.id == "call-1"
    assert function_response.name == "extract_assets"
    assert function_response.response == {
        "assets": [
            {
                "description": "logo",
                "image_part_index": 0,
                "image_display_name": "asset_0.png",
            }
        ]
    }

    response_parts = cast(Any, function_response.parts)
    assert len(response_parts) == 1
    inline_data = response_parts[0].inline_data
    assert inline_data.mime_type == "image/png"
    assert inline_data.display_name == "asset_0.png"
    assert inline_data.data == b"logo-image"
