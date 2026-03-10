import pytest
from fastapi import HTTPException

from routes.evals import OpenAIInputCompareRequest, compare_openai_inputs_for_evals


@pytest.mark.asyncio
async def test_compare_openai_inputs_for_evals_returns_first_difference() -> None:
    response = await compare_openai_inputs_for_evals(
        OpenAIInputCompareRequest(
            left_json=(
                '{"input":[{"role":"system","content":"A"},'
                '{"role":"user","content":"Build dashboard"}]}'
            ),
            right_json=(
                '{"input":[{"role":"system","content":"A"},'
                '{"role":"user","content":"Build landing page"}]}'
            ),
        )
    )

    assert response.common_prefix_items == 1
    assert response.left_item_count == 2
    assert response.right_item_count == 2
    assert response.difference is not None
    assert response.difference.path == "input[1].content"
    assert response.difference.left_value == "Build dashboard"
    assert response.difference.right_value == "Build landing page"


@pytest.mark.asyncio
async def test_compare_openai_inputs_for_evals_rejects_invalid_json() -> None:
    with pytest.raises(HTTPException) as error_info:
        await compare_openai_inputs_for_evals(
            OpenAIInputCompareRequest(
                left_json='{"input": [',
                right_json='{"input": []}',
            )
        )

    assert error_info.value.status_code == 400
    assert "Invalid left JSON" in error_info.value.detail
