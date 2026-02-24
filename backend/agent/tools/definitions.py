from typing import Any, Dict, List

from agent.tools.types import CanonicalToolDefinition


def _create_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path for the main HTML file. Use index.html if unsure.",
            },
            "content": {
                "type": "string",
                "description": "Full HTML for the single-file app.",
            },
        },
        "required": ["content"],
    }


def _edit_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path for the main HTML file.",
            },
            "old_text": {
                "type": "string",
                "description": "Exact text to replace. Must match the file contents.",
            },
            "new_text": {
                "type": "string",
                "description": "Replacement text.",
            },
            "count": {
                "type": "integer",
                "description": "How many occurrences to replace. Use -1 for all.",
            },
            "edits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "old_text": {"type": "string"},
                        "new_text": {"type": "string"},
                        "count": {"type": "integer"},
                    },
                    "required": ["old_text", "new_text"],
                },
            },
        },
    }


def _image_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "prompts": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "Prompt describing a single image to generate.",
                },
            }
        },
        "required": ["prompts"],
    }


def _remove_background_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "image_urls": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "URL of an image to remove the background from.",
                },
            },
        },
        "required": ["image_urls"],
    }


def _retrieve_option_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "option_number": {
                "type": "integer",
                "description": "1-based option number to retrieve (Option 1, Option 2, etc.).",
            }
        },
        "required": ["option_number"],
    }


def canonical_tool_definitions(
    image_generation_enabled: bool = True,
) -> List[CanonicalToolDefinition]:
    tools: List[CanonicalToolDefinition] = [
        CanonicalToolDefinition(
            name="create_file",
            description=(
                "Create the main HTML file for the app. Use exactly once to write the "
                "full HTML. Returns a success message and file metadata."
            ),
            parameters=_create_schema(),
        ),
        CanonicalToolDefinition(
            name="edit_file",
            description=(
                "Edit the main HTML file using exact string replacements. Do not "
                "regenerate the entire file. Returns the updated file content."
            ),
            parameters=_edit_schema(),
        ),
    ]
    if image_generation_enabled:
        tools.append(
            CanonicalToolDefinition(
                name="generate_images",
                description=(
                    "Generate image URLs from prompts. Use to replace placeholder images. "
                    "You can pass multiple prompts at once."
                ),
                parameters=_image_schema(),
            )
        )
    tools.extend(
        [
            CanonicalToolDefinition(
                name="remove_background",
                description=(
                    "Remove the background from one or more images. You can pass multiple "
                    "image URLs at once. Returns URLs to the processed images with "
                    "transparent backgrounds."
                ),
                parameters=_remove_background_schema(),
            ),
            CanonicalToolDefinition(
                name="retrieve_option",
                description=(
                    "Retrieve the full HTML for a specific option (variant) so you can "
                    "reference it."
                ),
                parameters=_retrieve_option_schema(),
            ),
        ]
    )
    return tools
