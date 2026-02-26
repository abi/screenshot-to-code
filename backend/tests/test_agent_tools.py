from agent.tools import canonical_tool_definitions
from agent.providers.openai import serialize_openai_tools
from image_generation.aspect_ratios import SUPPORTED_ASPECT_RATIOS


def test_canonical_tool_definitions_include_generate_images_when_enabled() -> None:
    tool_names = [tool.name for tool in canonical_tool_definitions(True)]
    assert "generate_images" in tool_names


def test_canonical_tool_definitions_exclude_generate_images_when_disabled() -> None:
    tool_names = [tool.name for tool in canonical_tool_definitions(False)]
    assert "generate_images" not in tool_names


def test_generate_images_schema_exposes_supported_aspect_ratios() -> None:
    tools = canonical_tool_definitions(True)
    generate_images_tool = next(tool for tool in tools if tool.name == "generate_images")
    schema = generate_images_tool.parameters
    prompt_item = schema["properties"]["prompts"]["items"]
    assert prompt_item["type"] == "object"
    assert prompt_item["properties"]["aspect_ratio"]["enum"] == list(SUPPORTED_ASPECT_RATIOS)


def test_openai_generate_images_schema_is_compatible() -> None:
    tools = canonical_tool_definitions(True)
    serialized_tools = serialize_openai_tools(tools)
    generate_images_tool = next(
        tool for tool in serialized_tools if tool["name"] == "generate_images"
    )
    prompt_item = generate_images_tool["parameters"]["properties"]["prompts"]["items"]
    assert "oneOf" not in prompt_item
    assert None in prompt_item["properties"]["aspect_ratio"]["enum"]
