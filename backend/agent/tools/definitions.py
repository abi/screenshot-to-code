from typing import Any, Dict, List

from agent.tools.types import CanonicalToolDefinition
from image_generation.replicate import P_IMAGE_EDIT_ASPECT_RATIOS
from uploaded_assets.tools import SAVE_ASSETS_TOOL_DEFINITION


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


def _edit_image_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": (
                    "Clear edit instruction. Refer to inputs as image 1, image 2, "
                    "and so on when multiple images are provided."
                ),
            },
            "image_urls": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": (
                        "URL of a source/reference image. For editing, put the main "
                        "image first."
                    ),
                },
            },
            "aspect_ratio": {
                "type": "string",
                "enum": list(P_IMAGE_EDIT_ASPECT_RATIOS),
                "default": "match_input_image",
                "description": (
                    "Aspect ratio for the edited image. Use match_input_image to "
                    "match the first image. Allowed values: match_input_image, "
                    "1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3."
                ),
            },
        },
        "required": ["prompt", "image_urls"],
    }


def _extract_assets_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "asset_descriptions": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": (
                        "Short text description of one visual asset to extract "
                        "from the input image."
                    ),
                },
            },
        },
        "required": ["asset_descriptions"],
    }


def _screenshot_preview_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {},
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
    image_editing_enabled: bool = True,
    asset_extraction_enabled: bool = True,
    screenshot_enabled: bool = True,
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
                "regenerate the entire file. Returns a success message plus edit "
                "details, including a unified diff and first changed line."
            ),
            parameters=_edit_schema(),
        ),
    ]
    if image_generation_enabled:
        tools.append(
            CanonicalToolDefinition(
                name="generate_images",
                description=(
                    "Generate image URLs from prompts using an image generation model. Prompt in detail, and when prompting for people, include details about their appearance such as their ethnicity, hair color, features, etc." +
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
        ]
    )
    if image_editing_enabled:
        tools.append(
            CanonicalToolDefinition(
                name="edit_image",
                description=(
                    "Edit one or more images using a text prompt. Provide the main "
                    "image first, followed by optional reference images. Returns a URL "
                    "to the edited image."
                ),
                parameters=_edit_image_schema(),
            )
        )
    if asset_extraction_enabled:
        tools.append(
            CanonicalToolDefinition(
                name="extract_assets",
                description=(
                    "Extract one or more visual assets from the input screenshot or "
                    "reference images using Gemini. Pass a list of text descriptions "
                    "for the assets to extract. Returns each asset (in the same order) "
                    "with a permanent, embeddable public_url. These assets are already "
                    "saved — do NOT call save_assets on them (save_assets is only for "
                    "user-uploaded images)."
                ),
                parameters=_extract_assets_schema(),
            )
        )
    if screenshot_enabled:
        tools.append(
            CanonicalToolDefinition(
                name="screenshot_preview",
                description=(
                    "Render the current HTML file in a headless browser and return "
                    "full-page desktop and mobile screenshots so you can visually "
                    "verify your work. Use after creating or substantially editing "
                    "the file to check layout, spacing, and fidelity to the "
                    "requested design. Screenshots are returned as attached images."
                ),
                parameters=_screenshot_preview_schema(),
            )
        )
    tools.extend(
        [
            SAVE_ASSETS_TOOL_DEFINITION,
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
