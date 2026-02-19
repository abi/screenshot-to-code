import unittest
from prompts.system_prompt import SYSTEM_PROMPT


class TestTextPrompts(unittest.TestCase):
    def test_html_tailwind_system_prompt(self):
        self.assertIn("You are a coding agent", SYSTEM_PROMPT)
        self.assertIn("Tooling instructions", SYSTEM_PROMPT)
        self.assertIn("Stack-specific instructions", SYSTEM_PROMPT)


if __name__ == "__main__":
    unittest.main()
