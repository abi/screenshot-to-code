from agent.tools.edit_diff import (
    count_fuzzy_occurrences,
    detect_line_ending,
    fuzzy_find_text,
    generate_diff_string,
    normalize_for_fuzzy_match,
    normalize_to_lf,
    restore_line_endings,
    strip_bom,
)


class TestDetectLineEnding:
    def test_lf_only(self) -> None:
        assert detect_line_ending("hello\nworld\n") == "\n"

    def test_crlf(self) -> None:
        assert detect_line_ending("hello\r\nworld\r\n") == "\r\n"

    def test_no_newlines(self) -> None:
        assert detect_line_ending("hello") == "\n"

    def test_mixed_crlf_first(self) -> None:
        assert detect_line_ending("a\r\nb\nc") == "\r\n"


class TestNormalizeToLF:
    def test_crlf_to_lf(self) -> None:
        assert normalize_to_lf("a\r\nb\r\n") == "a\nb\n"

    def test_cr_to_lf(self) -> None:
        assert normalize_to_lf("a\rb\r") == "a\nb\n"

    def test_already_lf(self) -> None:
        assert normalize_to_lf("a\nb\n") == "a\nb\n"


class TestRestoreLineEndings:
    def test_restore_crlf(self) -> None:
        assert restore_line_endings("a\nb\n", "\r\n") == "a\r\nb\r\n"

    def test_keep_lf(self) -> None:
        assert restore_line_endings("a\nb\n", "\n") == "a\nb\n"


class TestNormalizeForFuzzyMatch:
    def test_trailing_whitespace(self) -> None:
        assert normalize_for_fuzzy_match("hello   \nworld  ") == "hello\nworld"

    def test_smart_single_quotes(self) -> None:
        result = normalize_for_fuzzy_match("\u2018hello\u2019")
        assert result == "'hello'"

    def test_smart_double_quotes(self) -> None:
        result = normalize_for_fuzzy_match("\u201chello\u201d")
        assert result == '"hello"'

    def test_em_dash(self) -> None:
        result = normalize_for_fuzzy_match("hello\u2014world")
        assert result == "hello-world"

    def test_nbsp(self) -> None:
        result = normalize_for_fuzzy_match("hello\u00a0world")
        assert result == "hello world"


class TestFuzzyFindText:
    def test_exact_match(self) -> None:
        result = fuzzy_find_text("hello world", "world")
        assert result.found is True
        assert result.index == 6
        assert result.match_length == 5
        assert result.used_fuzzy_match is False

    def test_fuzzy_match_trailing_whitespace(self) -> None:
        result = fuzzy_find_text("hello   \nworld", "hello\nworld")
        assert result.found is True
        assert result.used_fuzzy_match is True

    def test_fuzzy_match_smart_quotes(self) -> None:
        result = fuzzy_find_text("\u201chello\u201d", '"hello"')
        assert result.found is True
        assert result.used_fuzzy_match is True

    def test_no_match(self) -> None:
        result = fuzzy_find_text("hello world", "goodbye")
        assert result.found is False


class TestCountFuzzyOccurrences:
    def test_single_occurrence(self) -> None:
        assert count_fuzzy_occurrences("hello world", "world") == 1

    def test_multiple_occurrences(self) -> None:
        assert count_fuzzy_occurrences("ab ab ab", "ab") == 3

    def test_no_occurrences(self) -> None:
        assert count_fuzzy_occurrences("hello", "world") == 0

    def test_fuzzy_occurrences(self) -> None:
        content = "\u201chello\u201d and \u201chello\u201d"
        assert count_fuzzy_occurrences(content, '"hello"') == 2


class TestStripBom:
    def test_with_bom(self) -> None:
        text, bom = strip_bom("\ufeffhello")
        assert text == "hello"
        assert bom == "\ufeff"

    def test_without_bom(self) -> None:
        text, bom = strip_bom("hello")
        assert text == "hello"
        assert bom == ""


class TestGenerateDiffString:
    def test_simple_replacement(self) -> None:
        old = "line1\nold line\nline3\n"
        new = "line1\nnew line\nline3\n"
        diff_str, first_changed = generate_diff_string(old, new)
        assert first_changed is not None
        assert "+new line" in diff_str
        assert "-old line" in diff_str

    def test_no_changes(self) -> None:
        content = "line1\nline2\n"
        diff_str, first_changed = generate_diff_string(content, content)
        assert diff_str == ""
        assert first_changed is None
