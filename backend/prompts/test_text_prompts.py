import unittest
from prompts.text_prompts import HTML_TAILWIND_SYSTEM_PROMPT


class TestTextPrompts(unittest.TestCase):
    def test_html_tailwind_system_prompt(self):
        self.maxDiff = None

        print(HTML_TAILWIND_SYSTEM_PROMPT)

        expected_prompt = """
You are an expert Tailwind developer.


- Make sure to make it look modern and sleek.
- Use modern, professional fonts and colors.
- Follow UX best practices.
- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" and "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- For images, use placeholder images from https://placehold.co and include a detailed description of the image in the alt text so that an image generation AI can generate the image later.

In terms of libraries,

- Use this script to include Tailwind: <script src="https://cdn.tailwindcss.com"></script>

- You can use Google Fonts
- Font Awesome for icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"></link>


Return only the full code in <html></html> tags.
Do not include markdown "```" or "```html" at the start or end.
Reply with only the code, and no text/explanation before and after the code.
"""
        self.assertEqual(HTML_TAILWIND_SYSTEM_PROMPT.strip(), expected_prompt.strip())


if __name__ == "__main__":
    unittest.main()
