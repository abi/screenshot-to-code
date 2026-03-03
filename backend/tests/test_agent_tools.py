from agent.tools import canonical_tool_definitions


def test_canonical_tool_definitions_always_include_generate_images() -> None:
    tool_names = [tool.name for tool in canonical_tool_definitions()]
    assert "generate_images" in tool_names
