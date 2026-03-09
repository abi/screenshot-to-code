from agent.tools import canonical_tool_definitions


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
