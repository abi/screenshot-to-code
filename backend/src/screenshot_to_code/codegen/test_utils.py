import unittest
from codegen.utils import extract_html_content


class TestUtils(unittest.TestCase):

    def test_extract_html_content_with_html_tags(self):
        text = "<html><body><p>Hello, World!</p></body></html>"
        expected = "<html><body><p>Hello, World!</p></body></html>"
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_without_html_tags(self):
        text = "No HTML content here."
        expected = "No HTML content here."
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_with_partial_html_tags(self):
        text = "<html><body><p>Hello, World!</p></body>"
        expected = "<html><body><p>Hello, World!</p></body>"
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_with_multiple_html_tags(self):
        text = "<html><body><p>First</p></body></html> Some text <html><body><p>Second</p></body></html>"
        expected = "<html><body><p>First</p></body></html>"
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    ## The following are tests based on actual LLM outputs

    def test_extract_html_content_some_explanation_before(self):
        text = """Got it! You want the song list to be displayed horizontally. I'll update the code to ensure that the song list is displayed in a horizontal layout.

        Here's the updated code:

        <html lang="en"><head></head><body class="bg-black text-white"></body></html>"""
        expected = '<html lang="en"><head></head><body class="bg-black text-white"></body></html>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_markdown_tags(self):
        text = "```html<head></head>```"
        expected = "```html<head></head>```"
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_doctype_text(self):
        text = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
        expected = '<html lang="en"><head></head><body></body></html>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)


if __name__ == "__main__":
    unittest.main()
