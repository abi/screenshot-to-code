import pytest
from unittest.mock import patch, MagicMock
import sys
from typing import Any

# Mock moviepy before importing prompts
sys.modules["moviepy"] = MagicMock()
sys.modules["moviepy.editor"] = MagicMock()

from prompts import create_prompt


def assert_structure_match(actual: Any, expected: Any, path: str = "") -> None:
    """
    Compare actual and expected structures with special markers:
    - <ANY>: Matches any value
    - <CONTAINS:text>: Checks if the actual value contains 'text'

    Args:
        actual: The actual value to check
        expected: The expected value or pattern
        path: Current path in the structure (for error messages)
    """
    if (
        isinstance(expected, str)
        and expected.startswith("<")
        and expected.endswith(">")
    ):
        # Handle special markers
        if expected == "<ANY>":
            # Match any value
            return
        elif expected.startswith("<CONTAINS:") and expected.endswith(">"):
            # Extract the text to search for
            search_text = expected[10:-1]  # Remove "<CONTAINS:" and ">"
            assert isinstance(
                actual, str
            ), f"At {path}: expected string, got {type(actual).__name__}"
            assert (
                search_text in actual
            ), f"At {path}: '{search_text}' not found in '{actual}'"
            return

    # Handle different types
    if isinstance(expected, dict):
        assert isinstance(
            actual, dict
        ), f"At {path}: expected dict, got {type(actual).__name__}"
        for key, value in expected.items():
            assert key in actual, f"At {path}: key '{key}' not found in actual"
            assert_structure_match(actual[key], value, f"{path}.{key}" if path else key)
    elif isinstance(expected, list):
        assert isinstance(
            actual, list
        ), f"At {path}: expected list, got {type(actual).__name__}"
        assert len(actual) == len(
            expected
        ), f"At {path}: list length mismatch (expected {len(expected)}, got {len(actual)})"
        for i, (a, e) in enumerate(zip(actual, expected)):
            assert_structure_match(a, e, f"{path}[{i}]")
    else:
        # Direct comparison for other types
        assert actual == expected, f"At {path}: expected {expected}, got {actual}"


class TestCreatePrompt:
    """Test cases for create_prompt function."""

    # Test data constants
    TEST_IMAGE_URL = "data:image/png;base64,test_image_data"
    RESULT_IMAGE_URL = "data:image/png;base64,result_image_data"
    MOCK_SYSTEM_PROMPT = "Mock HTML Tailwind system prompt"
    TEST_STACK = "html_tailwind"

    @pytest.mark.asyncio
    async def test_image_mode_create_single_image(self):
        """Test create generation with single image in image mode."""
        # Setup test data
        params = {
            "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
            "generationType": "create",
        }

        # Mock the system prompts
        mock_system_prompts = {self.TEST_STACK: self.MOCK_SYSTEM_PROMPT}

        with patch("prompts.SYSTEM_PROMPTS", mock_system_prompts):
            # Call the function
            messages, image_cache = await create_prompt(
                params, self.TEST_STACK, "image"
            )

            # Define expected structure
            expected = {
                "messages": [
                    {"role": "system", "content": self.MOCK_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": self.TEST_IMAGE_URL,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "text",
                                "text": "<CONTAINS:Generate code for a web page that looks exactly like this.>",
                            },
                        ],
                    },
                ],
                "image_cache": {},
            }

            # Assert the structure matches
            actual = {"messages": messages, "image_cache": image_cache}
            assert_structure_match(actual, expected)

    @pytest.mark.asyncio
    async def test_image_mode_create_with_result_image(self):
        """Test create generation with before/after images in image mode."""
        # Setup test data
        params = {
            "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
            "generationType": "create",
            "resultImage": self.RESULT_IMAGE_URL,
        }

        # Mock the system prompts
        mock_system_prompts = {self.TEST_STACK: self.MOCK_SYSTEM_PROMPT}

        with patch("prompts.SYSTEM_PROMPTS", mock_system_prompts):
            # Call the function
            messages, image_cache = await create_prompt(
                params, self.TEST_STACK, "image"
            )

            # Define expected structure
            expected = {
                "messages": [
                    {"role": "system", "content": self.MOCK_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": self.TEST_IMAGE_URL,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": self.RESULT_IMAGE_URL,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "text",
                                "text": "<CONTAINS:Generate code for a web page that looks exactly like this.>",
                            },
                        ],
                    },
                ],
                "image_cache": {},
            }

            # Assert the structure matches
            actual = {"messages": messages, "image_cache": image_cache}
            assert_structure_match(actual, expected)

    @pytest.mark.asyncio
    async def test_image_mode_update_with_history(self):
        """Test update generation with conversation history in image mode."""
        # Setup test data
        params = {
            "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
            "generationType": "update",
            "history": [
                {"text": "<html>Initial code</html>"},  # Assistant's initial code
                {"text": "Make the background blue"},  # User's update request
                {"text": "<html>Updated code</html>"},  # Assistant's response
                {"text": "Add a header"},  # User's new request
            ],
        }

        # Mock the system prompts and image cache function
        mock_system_prompts = {self.TEST_STACK: self.MOCK_SYSTEM_PROMPT}

        with patch("prompts.SYSTEM_PROMPTS", mock_system_prompts), patch(
            "prompts.create_alt_url_mapping", return_value={"mock": "cache"}
        ):
            # Call the function
            messages, image_cache = await create_prompt(
                params, self.TEST_STACK, "image"
            )

            # Define expected structure
            expected = {
                "messages": [
                    {"role": "system", "content": self.MOCK_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": self.TEST_IMAGE_URL,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "text",
                                "text": "<CONTAINS:Generate code for a web page that looks exactly like this.>",
                            },
                        ],
                    },
                    {"role": "assistant", "content": "<html>Initial code</html>"},
                    {"role": "user", "content": "Make the background blue"},
                    {"role": "assistant", "content": "<html>Updated code</html>"},
                    {"role": "user", "content": "Add a header"},
                ],
                "image_cache": {"mock": "cache"},
            }

            # Assert the structure matches
            actual = {"messages": messages, "image_cache": image_cache}
            assert_structure_match(actual, expected)
