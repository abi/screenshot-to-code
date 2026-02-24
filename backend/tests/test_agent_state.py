from agent.state import AgentFileState, ensure_str, extract_text_content, seed_file_state_from_messages


class TestEnsureStr:
    def test_none_returns_empty(self) -> None:
        assert ensure_str(None) == ""

    def test_string_passthrough(self) -> None:
        assert ensure_str("hello") == "hello"

    def test_int_converted(self) -> None:
        assert ensure_str(42) == "42"

    def test_float_converted(self) -> None:
        assert ensure_str(3.14) == "3.14"

    def test_bool_converted(self) -> None:
        assert ensure_str(True) == "True"

    def test_empty_string(self) -> None:
        assert ensure_str("") == ""

    def test_list_converted(self) -> None:
        assert ensure_str([1, 2]) == "[1, 2]"


class TestExtractTextContent:
    def test_string_content(self) -> None:
        msg = {"role": "user", "content": "hello world"}
        assert extract_text_content(msg) == "hello world"

    def test_list_content_with_text_part(self) -> None:
        msg = {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAA"}},
                {"type": "text", "text": "describe this"},
            ],
        }
        assert extract_text_content(msg) == "describe this"

    def test_list_content_without_text_part(self) -> None:
        msg = {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAA"}},
            ],
        }
        assert extract_text_content(msg) == ""

    def test_empty_content(self) -> None:
        msg = {"role": "user", "content": ""}
        assert extract_text_content(msg) == ""

    def test_missing_content(self) -> None:
        msg = {"role": "user"}
        assert extract_text_content(msg) == ""

    def test_none_text_in_part(self) -> None:
        msg = {
            "role": "user",
            "content": [{"type": "text", "text": None}],
        }
        assert extract_text_content(msg) == ""


class TestSeedFileStateFromMessages:
    def test_already_has_content_is_noop(self) -> None:
        state = AgentFileState(content="<html>existing</html>")
        messages = [
            {"role": "assistant", "content": "<html>new content</html>"},
        ]
        seed_file_state_from_messages(state, messages)
        assert state.content == "<html>existing</html>"

    def test_seeds_from_last_assistant_message(self) -> None:
        state = AgentFileState()
        messages = [
            {"role": "system", "content": "You are a coding agent."},
            {"role": "assistant", "content": "<html>first</html>"},
            {"role": "user", "content": "update it"},
            {"role": "assistant", "content": "<html>second</html>"},
        ]
        seed_file_state_from_messages(state, messages)
        assert state.content == "<html>second</html>"

    def test_skips_user_messages(self) -> None:
        state = AgentFileState()
        messages = [
            {"role": "user", "content": "<html>user content</html>"},
        ]
        seed_file_state_from_messages(state, messages)
        assert state.content == ""

    def test_empty_messages_is_noop(self) -> None:
        state = AgentFileState()
        seed_file_state_from_messages(state, [])
        assert state.content == ""

    def test_seeds_from_system_message_with_marker(self) -> None:
        state = AgentFileState()
        messages = [
            {
                "role": "system",
                "content": "Here is the code of the app:\n<html><body>hello</body></html>",
            },
        ]
        seed_file_state_from_messages(state, messages)
        assert "<html><body>hello</body></html>" in state.content

    def test_defaults_path_to_index_html(self) -> None:
        state = AgentFileState(path="")
        messages = [
            {"role": "assistant", "content": "<html>code</html>"},
        ]
        seed_file_state_from_messages(state, messages)
        assert state.path == "index.html"

    def test_extracts_html_from_assistant_with_extra_text(self) -> None:
        state = AgentFileState()
        messages = [
            {
                "role": "assistant",
                "content": "Here is the code:\n<html><body>page</body></html>\nDone!",
            },
        ]
        seed_file_state_from_messages(state, messages)
        assert "<html>" in state.content
        assert "<body>page</body>" in state.content
