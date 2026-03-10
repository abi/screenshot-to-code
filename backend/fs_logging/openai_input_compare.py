import json
from dataclasses import dataclass
from typing import Any, TypeAlias, cast

from fs_logging.openai_input_formatting import (
    summarize_responses_input_item,
    to_serializable,
)

JSONScalar: TypeAlias = None | bool | int | float | str
JSONValue: TypeAlias = JSONScalar | list["JSONValue"] | dict[str, "JSONValue"]


@dataclass(frozen=True)
class OpenAIInputDifference:
    item_index: int
    path: str
    left_summary: str
    right_summary: str
    left_value: Any
    right_value: Any


@dataclass(frozen=True)
class OpenAIInputComparison:
    common_prefix_items: int
    left_item_count: int
    right_item_count: int
    difference: OpenAIInputDifference | None


def _extract_input_items(payload: Any) -> list[JSONValue]:
    serialized = cast(JSONValue, to_serializable(payload))
    if isinstance(serialized, list):
        return serialized
    if isinstance(serialized, dict):
        serialized_dict = cast(dict[str, JSONValue], serialized)
        input_items = serialized_dict.get("input")
        if isinstance(input_items, list):
            return cast(list[JSONValue], input_items)
    raise ValueError("Expected a raw input array or a request payload with an 'input' list")


def _as_json_dict(value: JSONValue) -> dict[str, JSONValue]:
    return cast(dict[str, JSONValue], value)


def _as_json_list(value: JSONValue) -> list[JSONValue]:
    return cast(list[JSONValue], value)


def _append_dict_path(path: str, key: str) -> str:
    if not path:
        return key
    return f"{path}.{key}"


def _append_list_path(path: str, index: int) -> str:
    return f"{path}[{index}]"


def _find_first_value_difference(
    left: JSONValue,
    right: JSONValue,
    path: str = "",
) -> tuple[str, JSONValue, JSONValue] | None:
    if type(left) is not type(right):
        return path, left, right

    if isinstance(left, dict):
        left_dict = _as_json_dict(left)
        right_dict = _as_json_dict(right)
        left_keys = list(left_dict.keys())
        right_keys = list(right_dict.keys())
        for index in range(min(len(left_keys), len(right_keys))):
            left_key = left_keys[index]
            right_key = right_keys[index]
            if left_key != right_key:
                key_path = _append_dict_path(path, left_key)
                return key_path, left, right

        if len(left_keys) != len(right_keys):
            extra_key = (
                left_keys[len(right_keys)]
                if len(left_keys) > len(right_keys)
                else right_keys[len(left_keys)]
            )
            key_path = _append_dict_path(path, extra_key)
            left_value = left_dict.get(extra_key)
            right_value = right_dict.get(extra_key)
            return key_path, cast(JSONValue, left_value), cast(JSONValue, right_value)

        for key in left_keys:
            nested = _find_first_value_difference(
                left_dict[key],
                right_dict[key],
                _append_dict_path(path, key),
            )
            if nested is not None:
                return nested
        return None

    if isinstance(left, list):
        left_list = _as_json_list(left)
        right_list = _as_json_list(right)
        for index in range(min(len(left_list), len(right_list))):
            nested = _find_first_value_difference(
                left_list[index],
                right_list[index],
                _append_list_path(path, index),
            )
            if nested is not None:
                return nested

        if len(left_list) != len(right_list):
            index = min(len(left_list), len(right_list))
            item_path = _append_list_path(path, index)
            left_value = left_list[index] if index < len(left_list) else None
            right_value = right_list[index] if index < len(right_list) else None
            return item_path, left_value, right_value
        return None

    if left != right:
        return path, left, right

    return None


def compare_openai_inputs(
    left_payload: Any,
    right_payload: Any,
) -> OpenAIInputComparison:
    left_items = _extract_input_items(left_payload)
    right_items = _extract_input_items(right_payload)

    common_prefix_items = 0
    for index in range(min(len(left_items), len(right_items))):
        left_item = left_items[index]
        right_item = right_items[index]
        if left_item == right_item:
            common_prefix_items += 1
            continue

        nested_difference = _find_first_value_difference(left_item, right_item)
        nested_path = "" if nested_difference is None else nested_difference[0]
        path = f"input[{index}]"
        if nested_path:
            if nested_path.startswith("["):
                path = f"{path}{nested_path}"
            else:
                path = f"{path}.{nested_path}"

        left_value = left_item if nested_difference is None else nested_difference[1]
        right_value = right_item if nested_difference is None else nested_difference[2]

        return OpenAIInputComparison(
            common_prefix_items=common_prefix_items,
            left_item_count=len(left_items),
            right_item_count=len(right_items),
            difference=OpenAIInputDifference(
                item_index=index,
                path=path,
                left_summary=summarize_responses_input_item(index, left_item),
                right_summary=summarize_responses_input_item(index, right_item),
                left_value=left_value,
                right_value=right_value,
            ),
        )

    if len(left_items) != len(right_items):
        index = min(len(left_items), len(right_items))
        left_item = left_items[index] if index < len(left_items) else None
        right_item = right_items[index] if index < len(right_items) else None
        return OpenAIInputComparison(
            common_prefix_items=common_prefix_items,
            left_item_count=len(left_items),
            right_item_count=len(right_items),
            difference=OpenAIInputDifference(
                item_index=index,
                path=f"input[{index}]",
                left_summary=(
                    summarize_responses_input_item(index, left_item)
                    if left_item is not None
                    else f"{index:02d} <missing>"
                ),
                right_summary=(
                    summarize_responses_input_item(index, right_item)
                    if right_item is not None
                    else f"{index:02d} <missing>"
                ),
                left_value=left_item,
                right_value=right_item,
            ),
        )

    return OpenAIInputComparison(
        common_prefix_items=common_prefix_items,
        left_item_count=len(left_items),
        right_item_count=len(right_items),
        difference=None,
    )


def format_openai_input_comparison(comparison: OpenAIInputComparison) -> str:
    lines = [
        "OpenAI input comparison",
        f"common_prefix_items={comparison.common_prefix_items}",
        f"left_item_count={comparison.left_item_count}",
        f"right_item_count={comparison.right_item_count}",
    ]

    difference = comparison.difference
    if difference is None:
        lines.append("difference=none")
        return "\n".join(lines)

    lines.extend(
        [
            f"first_different_item_index={difference.item_index}",
            f"first_different_path={difference.path}",
            f"left_summary={difference.left_summary}",
            f"right_summary={difference.right_summary}",
            "left_value=" + json.dumps(difference.left_value, indent=2, ensure_ascii=False),
            "right_value=" + json.dumps(
                difference.right_value,
                indent=2,
                ensure_ascii=False,
            ),
        ]
    )
    return "\n".join(lines)


def compare_openai_input_json_strings(
    left_json: str,
    right_json: str,
) -> OpenAIInputComparison:
    left_payload = json.loads(left_json)
    right_payload = json.loads(right_json)
    return compare_openai_inputs(left_payload, right_payload)
