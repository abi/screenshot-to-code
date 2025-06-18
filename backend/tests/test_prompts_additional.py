import pytest
from unittest.mock import patch, MagicMock
import sys
from typing import Any, Dict, List, TypedDict
from openai.types.chat import ChatCompletionMessageParam

# Mock moviepy before importing prompts
sys.modules["moviepy"] = MagicMock()
sys.modules["moviepy.editor"] = MagicMock()

from prompts import create_prompt
from prompts.types import Stack

# Type definitions for test structures
class ExpectedResult(TypedDict):
    messages: List[ChatCompletionMessageParam]
    image_cache: Dict[str, str]


def assert_structure_match(actual: object, expected: object, path: str = "") -> None:
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
        expected_dict: Dict[str, object] = expected
        actual_dict: Dict[str, object] = actual
        for key, value in expected_dict.items():
            assert key in actual_dict, f"At {path}: key '{key}' not found in actual"
            assert_structure_match(actual_dict[key], value, f"{path}.{key}" if path else key)
    elif isinstance(expected, list):
        assert isinstance(
            actual, list
        ), f"At {path}: expected list, got {type(actual).__name__}"
        expected_list: List[object] = expected
        actual_list: List[object] = actual
        assert len(actual_list) == len(
            expected_list
        ), f"At {path}: list length mismatch (expected {len(expected_list)}, got {len(actual_list)})"
        for i, (a, e) in enumerate(zip(actual_list, expected_list)):
            assert_structure_match(a, e, f"{path}[{i}]")
    else:
        # Direct comparison for other types
        assert actual == expected, f"At {path}: expected {expected}, got {actual}"


class TestCreatePromptImageSupport:
    """Test cases for create_prompt function with image support in updates."""

    # Test data constants
    TEST_IMAGE_URL: str = "data:image/png;base64,test_image_data"
    MOCK_SYSTEM_PROMPT: str = "Mock HTML Tailwind system prompt"
    TEST_STACK: Stack = "html_tailwind"

    @pytest.mark.asyncio
    async def test_image_mode_update_with_multiple_images_in_history(self) -> None:
        """Test update with user message containing multiple images."""
        # Setup test data
        example1_url: str = "data:image/png;base64,example1"
        example2_url: str = "data:image/png;base64,example2"
        params: Dict[str, Any] = {
            "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
            "generationType": "update",
            "history": [
                {"text": "<html>Initial code</html>", "images": []},
                {"text": "Style like these examples", "images": [example1_url, example2_url]},
                {"text": "<html>Styled code</html>", "images": []}
            ]
        }

        # Mock the system prompts and image cache function
        mock_system_prompts: Dict[str, str] = {self.TEST_STACK: self.MOCK_SYSTEM_PROMPT}

        with patch("prompts.SYSTEM_PROMPTS", mock_system_prompts), \
             patch("prompts.create_alt_url_mapping", return_value={"mock": "cache"}):
            # Call the function
            messages, image_cache = await create_prompt(
                stack=self.TEST_STACK,
                input_mode="image",
                generation_type=params["generationType"],
                prompt=params["prompt"],
                history=params.get("history", []),
                is_imported_from_code=params.get("isImportedFromCode", False),
            )

            # Define expected structure
            expected: ExpectedResult = {
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
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": example1_url,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": example2_url,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "text",
                                "text": "Style like these examples",
                            },
                        ],
                    },
                    {"role": "assistant", "content": "<html>Styled code</html>"},
                ],
                "image_cache": {"mock": "cache"},
            }

            # Assert the structure matches
            actual: ExpectedResult = {"messages": messages, "image_cache": image_cache}
            assert_structure_match(actual, expected)

    @pytest.mark.asyncio
    async def test_update_with_empty_images_arrays(self) -> None:
        """Test that empty images arrays don't break existing functionality."""
        # Setup test data with explicit empty images arrays
        params: Dict[str, Any] = {
            "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
            "generationType": "update",
            "history": [
                {"text": "<html>Initial code</html>", "images": []},
                {"text": "Make it blue", "images": []},  # Explicit empty array
                {"text": "<html>Blue code</html>", "images": []}
            ]
        }

        # Mock the system prompts and image cache function
        mock_system_prompts: Dict[str, str] = {self.TEST_STACK: self.MOCK_SYSTEM_PROMPT}

        with patch("prompts.SYSTEM_PROMPTS", mock_system_prompts), \
             patch("prompts.create_alt_url_mapping", return_value={}):
            # Call the function
            messages, image_cache = await create_prompt(
                stack=self.TEST_STACK,
                input_mode="image",
                generation_type=params["generationType"],
                prompt=params["prompt"],
                history=params.get("history", []),
                is_imported_from_code=params.get("isImportedFromCode", False),
            )

            # Define expected structure - should be text-only messages
            expected: ExpectedResult = {
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
                    {"role": "user", "content": "Make it blue"},  # Text-only message
                    {"role": "assistant", "content": "<html>Blue code</html>"},
                ],
                "image_cache": {},
            }

            # Assert the structure matches
            actual: ExpectedResult = {"messages": messages, "image_cache": image_cache}
            assert_structure_match(actual, expected)

    @pytest.mark.asyncio
    async def test_imported_code_update_with_images_in_history(self) -> None:
        """Test imported code flow with images in update history."""
        # Setup test data
        ref_image_url: str = "data:image/png;base64,ref_image"
        params: Dict[str, Any] = {
            "isImportedFromCode": True,
            "generationType": "update",
            "history": [
                {"text": "<html>Original imported code</html>", "images": []},
                {"text": "Update with this reference", "images": [ref_image_url]},
                {"text": "<html>Updated code</html>", "images": []}
            ]
        }

        # Mock the imported code system prompts
        mock_imported_prompts: Dict[str, str] = {
            self.TEST_STACK: "Mock Imported Code System Prompt"
        }

        with patch("prompts.IMPORTED_CODE_SYSTEM_PROMPTS", mock_imported_prompts):
            # Call the function
            messages, image_cache = await create_prompt(
                stack=self.TEST_STACK,
                input_mode="image",
                generation_type=params["generationType"],
                prompt=params.get("prompt", {"text": "", "images": []}),
                history=params.get("history", []),
                is_imported_from_code=params.get("isImportedFromCode", False),
            )

            # Define expected structure
            expected: ExpectedResult = {
                "messages": [
                    {
                        "role": "system",
                        "content": "Mock Imported Code System Prompt\n Here is the code of the app: <html>Original imported code</html>",
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": ref_image_url,
                                    "detail": "high",
                                },
                            },
                            {
                                "type": "text",
                                "text": "Update with this reference",
                            },
                        ],
                    },
                    {"role": "assistant", "content": "<html>Updated code</html>"},
                ],
                "image_cache": {},
            }

            # Assert the structure matches
            actual: ExpectedResult = {"messages": messages, "image_cache": image_cache}
            assert_structure_match(actual, expected)
