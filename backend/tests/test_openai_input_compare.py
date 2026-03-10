from typing import Any

from fs_logging.openai_input_compare import (
    compare_openai_inputs,
    format_openai_input_comparison,
)


def test_compare_openai_inputs_returns_none_for_identical_inputs() -> None:
    payload: dict[str, Any] = {
        "input": [
            {"role": "system", "content": "You are a coding agent."},
            {"role": "user", "content": "Build a dashboard."},
        ]
    }

    comparison = compare_openai_inputs(payload, payload)

    assert comparison.common_prefix_items == 2
    assert comparison.left_item_count == 2
    assert comparison.right_item_count == 2
    assert comparison.difference is None
    assert "difference=none" in format_openai_input_comparison(comparison)


def test_compare_openai_inputs_finds_first_different_block_and_field() -> None:
    left_payload: dict[str, Any] = {
        "input": [
            {"role": "system", "content": "You are a coding agent."},
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Build a dashboard."},
                    {
                        "type": "input_image",
                        "image_url": "data:image/png;base64,left",
                        "detail": "original",
                    },
                ],
            },
        ]
    }
    right_payload: dict[str, Any] = {
        "input": [
            {"role": "system", "content": "You are a coding agent."},
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Build a dashboard."},
                    {
                        "type": "input_image",
                        "image_url": "data:image/png;base64,right",
                        "detail": "original",
                    },
                ],
            },
        ]
    }

    comparison = compare_openai_inputs(left_payload, right_payload)

    assert comparison.common_prefix_items == 1
    assert comparison.difference is not None
    assert comparison.difference.item_index == 1
    assert comparison.difference.path == "input[1].content[1].image_url"
    assert comparison.difference.left_value == "data:image/png;base64,left"
    assert comparison.difference.right_value == "data:image/png;base64,right"


def test_compare_openai_inputs_accepts_raw_input_arrays() -> None:
    left_input: list[dict[str, Any]] = [
        {"role": "system", "content": "You are a coding agent."},
        {"role": "user", "content": "Build a dashboard."},
    ]
    right_input: list[dict[str, Any]] = [
        {"role": "system", "content": "You are a coding agent."},
        {"role": "user", "content": "Build a landing page."},
    ]

    comparison = compare_openai_inputs(left_input, right_input)
    formatted = format_openai_input_comparison(comparison)

    assert comparison.difference is not None
    assert comparison.difference.path == "input[1].content"
    assert "first_different_item_index=1" in formatted
    assert "first_different_path=input[1].content" in formatted
