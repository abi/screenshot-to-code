from codegen.utils import extract_html_content


class TestExtractHtmlContentMarkdownFences:
    def test_strips_html_fence_and_extracts(self) -> None:
        text = "```html\n<html><body>hello</body></html>\n```"
        assert extract_html_content(text) == "<html><body>hello</body></html>"

    def test_strips_generic_fence(self) -> None:
        text = "```\n<html><body>hello</body></html>\n```"
        assert extract_html_content(text) == "<html><body>hello</body></html>"

    def test_fence_with_leading_text(self) -> None:
        text = "Here is the code:\n```html\n<html><body>hi</body></html>\n```"
        assert extract_html_content(text) == "<html><body>hi</body></html>"


class TestExtractHtmlContentDoctype:
    def test_doctype_with_html(self) -> None:
        text = '<!DOCTYPE html>\n<html lang="en"><head></head><body></body></html>'
        result = extract_html_content(text)
        assert result.startswith("<!DOCTYPE html>")
        assert "</html>" in result

    def test_doctype_case_insensitive(self) -> None:
        text = '<!doctype html>\n<html><body></body></html>'
        result = extract_html_content(text)
        assert "<!doctype html>" in result

    def test_doctype_in_fence(self) -> None:
        text = '```html\n<!DOCTYPE html>\n<html><body>page</body></html>\n```'
        result = extract_html_content(text)
        assert "<!DOCTYPE html>" in result
        assert "</html>" in result


class TestExtractHtmlContentFallbacks:
    def test_no_html_tags_returns_original(self) -> None:
        text = "Just some plain text with no HTML"
        assert extract_html_content(text) == text

    def test_html_with_attributes(self) -> None:
        text = '<html lang="en" class="dark"><body>content</body></html>'
        assert extract_html_content(text) == text

    def test_first_html_block_extracted_from_multiple(self) -> None:
        text = "<html>first</html> gap <html>second</html>"
        assert extract_html_content(text) == "<html>first</html>"

    def test_text_before_and_after_html(self) -> None:
        text = "Preamble\n<html><body>inner</body></html>\nAfterword"
        result = extract_html_content(text)
        assert result == "<html><body>inner</body></html>"
        assert "Preamble" not in result
        assert "Afterword" not in result

    def test_unclosed_html_tag_returns_original(self) -> None:
        text = "<html><body>no closing"
        assert extract_html_content(text) == text
