from agent.state import AgentFileState
from agent.tools import canonical_tool_definitions, summarize_tool_input
from agent.tools.types import ToolCall


def test_canonical_tool_definitions_include_generate_images_when_enabled() -> None:
    tool_names = [tool.name for tool in canonical_tool_definitions(True)]
    assert "generate_images" in tool_names


def test_canonical_tool_definitions_exclude_generate_images_when_disabled() -> None:
    tool_names = [tool.name for tool in canonical_tool_definitions(False)]
    assert "generate_images" not in tool_names


def test_edit_file_tool_description_matches_runtime_output_shape() -> None:
    edit_tool = next(
        tool for tool in canonical_tool_definitions(True) if tool.name == "edit_file"
    )

    assert "success message" in edit_tool.description
    assert "unified diff" in edit_tool.description


def test_canonical_tool_definitions_include_save_assets() -> None:
    tools = canonical_tool_definitions(True)
    tool_names = [tool.name for tool in tools]
    assert "save_assets" in tool_names
    save_assets_tool = next(tool for tool in tools if tool.name == "save_assets")
    assert save_assets_tool.parameters["required"] == ["asset_ids"]
    assert save_assets_tool.parameters["properties"]["asset_ids"]["type"] == "array"


def test_save_assets_tool_input_summary_uses_asset_ids() -> None:
    summary = summarize_tool_input(
        ToolCall(
            id="call-1",
            name="save_assets",
            arguments={"asset_ids": ["asset_one", "asset_two"]},
        ),
        AgentFileState(),
    )

    assert summary == {
        "count": 2,
        "asset_ids": ["asset_one", "asset_two"],
    }
