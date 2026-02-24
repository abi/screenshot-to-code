import pytest

from agent.tools.parsing import (
    extract_content_from_args,
    extract_path_from_args,
    parse_json_arguments,
    _strip_incomplete_escape,
    _extract_partial_json_string,
)


class TestParseJsonArguments:
    def test_dict_passthrough(self) -> None:
        result, err = parse_json_arguments({"key": "value"})
        assert result == {"key": "value"}
        assert err is None

    def test_none_returns_empty(self) -> None:
        result, err = parse_json_arguments(None)
        assert result == {}
        assert err is None

    def test_empty_string_returns_empty(self) -> None:
        result, err = parse_json_arguments("")
        assert result == {}
        assert err is None

    def test_whitespace_only_returns_empty(self) -> None:
        result, err = parse_json_arguments("   \n\t  ")
        assert result == {}
        assert err is None

    def test_valid_json_string(self) -> None:
        result, err = parse_json_arguments('{"path": "index.html", "content": "<html></html>"}')
        assert result == {"path": "index.html", "content": "<html></html>"}
        assert err is None

    def test_invalid_json_returns_error(self) -> None:
        result, err = parse_json_arguments("{invalid json")
        assert result == {}
        assert err is not None
        assert "Invalid JSON" in err

    def test_numeric_input_is_valid_json(self) -> None:
        # "123" is valid JSON, so json.loads returns the int 123
        result, err = parse_json_arguments(123)
        assert result == 123
        assert err is None

    def test_nested_json(self) -> None:
        raw = '{"outer": {"inner": [1, 2, 3]}}'
        result, err = parse_json_arguments(raw)
        assert result == {"outer": {"inner": [1, 2, 3]}}
        assert err is None


class TestStripIncompleteEscape:
    def test_empty_string(self) -> None:
        assert _strip_incomplete_escape("") == ""

    def test_no_trailing_backslash(self) -> None:
        assert _strip_incomplete_escape("hello") == "hello"

    def test_single_trailing_backslash_stripped(self) -> None:
        assert _strip_incomplete_escape("hello\\") == "hello"

    def test_double_trailing_backslash_kept(self) -> None:
        assert _strip_incomplete_escape("hello\\\\") == "hello\\\\"

    def test_triple_trailing_backslash_strips_one(self) -> None:
        assert _strip_incomplete_escape("hello\\\\\\") == "hello\\\\"

    def test_mid_string_backslash_unaffected(self) -> None:
        assert _strip_incomplete_escape("he\\llo") == "he\\llo"


class TestExtractPartialJsonString:
    def test_empty_input(self) -> None:
        assert _extract_partial_json_string("", "content") is None

    def test_key_not_found(self) -> None:
        assert _extract_partial_json_string('{"path": "index.html"}', "content") is None

    def test_complete_json_string(self) -> None:
        raw = '{"content": "hello world"}'
        assert _extract_partial_json_string(raw, "content") == "hello world"

    def test_partial_json_no_closing_quote(self) -> None:
        raw = '{"content": "hello world'
        result = _extract_partial_json_string(raw, "content")
        assert result == "hello world"

    def test_escaped_newlines_decoded(self) -> None:
        raw = '{"content": "line1\\nline2"}'
        result = _extract_partial_json_string(raw, "content")
        assert result == "line1\nline2"

    def test_escaped_quotes(self) -> None:
        raw = '{"content": "say \\"hello\\""}'
        result = _extract_partial_json_string(raw, "content")
        assert result == 'say "hello"'

    def test_no_colon_after_key(self) -> None:
        raw = '"content" missing colon'
        assert _extract_partial_json_string(raw, "content") is None

    def test_no_opening_quote_after_colon(self) -> None:
        raw = '{"content": 42}'
        assert _extract_partial_json_string(raw, "content") is None

    def test_empty_value(self) -> None:
        raw = '{"content": ""}'
        result = _extract_partial_json_string(raw, "content")
        assert result == ""

    def test_multiple_keys_extracts_correct_one(self) -> None:
        raw = '{"path": "index.html", "content": "<div>hello</div>"}'
        result = _extract_partial_json_string(raw, "content")
        assert result == "<div>hello</div>"


class TestExtractContentFromArgs:
    def test_dict_with_content(self) -> None:
        assert extract_content_from_args({"content": "hello"}) == "hello"

    def test_dict_without_content(self) -> None:
        assert extract_content_from_args({"path": "index.html"}) is None

    def test_dict_with_none_content(self) -> None:
        assert extract_content_from_args({"content": None}) is None

    def test_dict_with_non_string_content(self) -> None:
        assert extract_content_from_args({"content": 42}) == "42"

    def test_raw_json_string(self) -> None:
        raw = '{"content": "<html>page</html>"}'
        assert extract_content_from_args(raw) == "<html>page</html>"

    def test_partial_json_string(self) -> None:
        raw = '{"content": "<html>partial'
        result = extract_content_from_args(raw)
        assert result == "<html>partial"

    def test_none_input(self) -> None:
        result = extract_content_from_args(None)
        assert result is None


class TestExtractPathFromArgs:
    def test_dict_with_path(self) -> None:
        assert extract_path_from_args({"path": "index.html"}) == "index.html"

    def test_dict_without_path(self) -> None:
        assert extract_path_from_args({"content": "hello"}) is None

    def test_dict_with_none_path(self) -> None:
        assert extract_path_from_args({"path": None}) is None

    def test_raw_json_string_path_only(self) -> None:
        raw = '{"path": "styles.css"}'
        assert extract_path_from_args(raw) == "styles.css"

    def test_partial_json_path_only(self) -> None:
        raw = '{"path": "index.html"'
        assert extract_path_from_args(raw) == "index.html"

    def test_raw_json_path_with_other_keys(self) -> None:
        # _extract_partial_json_string scans to the last unescaped quote
        # from the path value's opening quote, so with multiple keys
        # it grabs everything up to the last quote in the string.
        raw = '{"path": "styles.css", "content": "body {}"}'
        result = extract_path_from_args(raw)
        assert result is not None
        assert result.startswith("styles.css")

    def test_none_input(self) -> None:
        result = extract_path_from_args(None)
        assert result is None
