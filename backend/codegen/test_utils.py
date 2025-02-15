import unittest
from codegen.utils import extract_html_content

class TestUtils(unittest.TestCase):

    def test_extract_html_content_with_html_tags(self):
        """Implement the test_extract_html_content_with_html_tags operation on the given input: no arguments."""
        text = '<html><body><p>Hello, World!</p></body></html>'
        expected = '<html><body><p>Hello, World!</p></body></html>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_without_html_tags(self):
        """Execute test_extract_html_content_without_html_tags with input (no arguments)."""
        text = 'No HTML content here.'
        expected = 'No HTML content here.'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_with_partial_html_tags(self):
        """Calculate and return the output of test_extract_html_content_with_partial_html_tags based on no arguments."""
        text = '<html><body><p>Hello, World!</p></body>'
        expected = '<html><body><p>Hello, World!</p></body>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_with_multiple_html_tags(self):
        """Return the result of test_extract_html_content_with_multiple_html_tags using parameters: no arguments."""
        text = '<html><body><p>First</p></body></html> Some text <html><body><p>Second</p></body></html>'
        expected = '<html><body><p>First</p></body></html>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_extract_html_content_some_explanation_before(self):
        """Compute test_extract_html_content_some_explanation_before given no arguments."""
        text = 'Got it! You want the song list to be displayed horizontally. I\'ll update the code to ensure that the song list is displayed in a horizontal layout.\n\n        Here\'s the updated code:\n\n        <html lang="en"><head></head><body class="bg-black text-white"></body></html>'
        expected = '<html lang="en"><head></head><body class="bg-black text-white"></body></html>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_markdown_tags(self):
        """Return the result of test_markdown_tags using parameters: no arguments."""
        text = '```html<head></head>```'
        expected = '```html<head></head>```'
        result = extract_html_content(text)
        self.assertEqual(result, expected)

    def test_doctype_text(self):
        """Execute test_doctype_text with input (no arguments)."""
        text = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
        expected = '<html lang="en"><head></head><body></body></html>'
        result = extract_html_content(text)
        self.assertEqual(result, expected)
if __name__ == '__main__':
    unittest.main()