from codegen.utils import extract_html_content


def test_extract_html_content_from_wrapped_file_tag() -> None:
    text = '<file path="index.html">\n<html><body><p>Hello</p></body></html>\n</file>'

    result = extract_html_content(text)

    assert result == "<html><body><p>Hello</p></body></html>"
