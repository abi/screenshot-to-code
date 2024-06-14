import unittest
from llm import convert_frontend_str_to_llm, Llm


class TestConvertFrontendStrToLlm(unittest.TestCase):
    def test_convert_valid_strings(self):
        self.assertEqual(
            convert_frontend_str_to_llm("gpt_4_vision"),
            Llm.GPT_4_VISION,
            "Should convert 'gpt_4_vision' to Llm.GPT_4_VISION",
        )
        self.assertEqual(
            convert_frontend_str_to_llm("claude_3_sonnet"),
            Llm.CLAUDE_3_SONNET,
            "Should convert 'claude_3_sonnet' to Llm.CLAUDE_3_SONNET",
        )
        self.assertEqual(
            convert_frontend_str_to_llm("claude-3-opus-20240229"),
            Llm.CLAUDE_3_OPUS,
            "Should convert 'claude-3-opus-20240229' to Llm.CLAUDE_3_OPUS",
        )
        self.assertEqual(
            convert_frontend_str_to_llm("gpt-4-turbo-2024-04-09"),
            Llm.GPT_4_TURBO_2024_04_09,
            "Should convert 'gpt-4-turbo-2024-04-09' to Llm.GPT_4_TURBO_2024_04_09",
        )
        self.assertEqual(
            convert_frontend_str_to_llm("gpt-4o-2024-05-13"),
            Llm.GPT_4O_2024_05_13,
            "Should convert 'gpt-4o-2024-05-13' to Llm.GPT_4O_2024_05_13",
        )

    def test_convert_invalid_string_raises_exception(self):
        with self.assertRaises(ValueError):
            convert_frontend_str_to_llm("invalid_string")
        with self.assertRaises(ValueError):
            convert_frontend_str_to_llm("another_invalid_string")


if __name__ == "__main__":
    unittest.main()
