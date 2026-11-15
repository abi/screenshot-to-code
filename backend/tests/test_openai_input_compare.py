from typing import Any

import pytest

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


@pytest.mark.parametrize(
    ("left_item", "right_item", "expected_path", "expected_left", "expected_right"),
    [
        # Same keys, different insertion order: only `content` differs. A
        # positional key comparison wrongly reports a difference at `role`.
        (
            {"role": "user", "content": "A", "type": "message"},
            {"content": "B", "role": "user", "type": "message"},
            "input[0].content",
            "A",
            "B",
        ),
        # Reordered keys are not a difference at all: dict equality is
        # order-independent, so the two input arrays should compare equal.
        (
            {"role": "user", "content": "A"},
            {"content": "A", "role": "user"},
            None,
            None,
            None,
        ),
        # Extra key in the middle: report the missing key's value, not the
        # whole dict, and on the correct side.
        (
            {"a": 1, "b": 2, "c": 3},
            {"a": 1, "c": 3},
            "input[0].b",
            2,
            None,
        ),
        # Extra key only on the right: the value belongs to the right side.
        (
            {"a": 1, "c": 3},
            {"a": 1, "b": 2, "c": 3},
            "input[0].b",
            None,
            2,
        ),
    ],
)
def test_dict_comparison_is_key_based_not_positional(
    left_item: dict[str, Any],
    right_item: dict[str, Any],
    expected_path: str | None,
    expected_left: Any,
    expected_right: Any,
) -> None:
    comparison = compare_openai_inputs(
        {"input": [left_item]}, {"input": [right_item]}
    )

    if expected_path is None:
        assert comparison.difference is None
        return

    assert comparison.difference is not None
    assert comparison.difference.path == expected_path
    assert comparison.difference.left_value == expected_left
    assert comparison.difference.right_value == expected_right
