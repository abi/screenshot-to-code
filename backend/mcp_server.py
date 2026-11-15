"""Streamable HTTP MCP server for screenshot-to-code generation."""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from mcp.server import MCPServer
from PIL import Image, UnidentifiedImageError

from prompts.prompt_types import Stack
from routes.generate_code import (
    AgenticGenerationStage,
    MessageType,
    ModelSelectionStage,
    ParameterExtractionStage,
    PromptCreationStage,
)


MAX_SCREENSHOT_BYTES = 20 * 1024 * 1024
MAX_INSTRUCTIONS_LENGTH = 4_000
MAX_DESIGN_SYSTEM_LENGTH = 20_000


class McpGenerationError(RuntimeError):
    """A safe error that can be returned to an MCP client."""


def _mcp_port() -> int:
    value = os.environ.get("SCREENSHOT_TO_CODE_MCP_PORT", "8000")
    try:
        port = int(value)
    except ValueError as exc:
        raise RuntimeError("SCREENSHOT_TO_CODE_MCP_PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise RuntimeError("SCREENSHOT_TO_CODE_MCP_PORT must be between 1 and 65535")
    return port


mcp = MCPServer(
    "Screenshot to Code",
    instructions=(
        "Turn a local UI screenshot into one generated frontend code variant. "
        "The screenshot path is resolved on the MCP server host."
    ),
)


def screenshot_data_url(image_path: str) -> str:
    """Read and validate a local raster screenshot as a data URL."""
    try:
        path = Path(image_path).expanduser().resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise McpGenerationError(f"Screenshot not found: {image_path}") from exc
    if not path.is_file():
        raise McpGenerationError(f"Screenshot is not a file: {image_path}")

    try:
        size = path.stat().st_size
    except OSError as exc:
        raise McpGenerationError(f"Could not read screenshot metadata: {exc}") from exc
    if size == 0:
        raise McpGenerationError("Screenshot is empty")
    if size > MAX_SCREENSHOT_BYTES:
        raise McpGenerationError(
            f"Screenshot exceeds the {MAX_SCREENSHOT_BYTES // (1024 * 1024)} MiB limit"
        )

    try:
        with Image.open(path) as image:
            image.verify()
            mime_type = Image.MIME.get(image.format or "")
        raw = path.read_bytes()
    except (OSError, UnidentifiedImageError) as exc:
        raise McpGenerationError("Screenshot is not a valid raster image") from exc
    if mime_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        raise McpGenerationError(
            "Unsupported screenshot format; use PNG, JPEG, WebP, or GIF"
        )
    encoded = base64.b64encode(raw).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def build_generation_params(
    data_url: str,
    stack: Stack,
    instructions: str,
    design_system: str | None,
    generate_images: bool,
    extract_assets: bool,
) -> dict[str, Any]:
    normalized_instructions = instructions.strip()
    if len(normalized_instructions) > MAX_INSTRUCTIONS_LENGTH:
        raise McpGenerationError(
            f"Instructions exceed {MAX_INSTRUCTIONS_LENGTH} characters"
        )
    normalized_design_system = design_system.strip() if design_system else None
    if normalized_design_system and len(normalized_design_system) > MAX_DESIGN_SYSTEM_LENGTH:
        raise McpGenerationError(
            f"Design system exceeds {MAX_DESIGN_SYSTEM_LENGTH} characters"
        )

    return {
        "generationType": "create",
        "inputMode": "image",
        "generatedCodeConfig": stack,
        "prompt": {
            "text": normalized_instructions or "Recreate this screenshot accurately.",
            "images": [data_url],
            "videos": [],
        },
        "history": [],
        "optionCodes": [],
        "isImageGenerationEnabled": generate_images,
        "isAssetExtractionEnabled": extract_assets,
        "designSystem": normalized_design_system,
    }


async def generate_single_variant(params: dict[str, Any]) -> dict[str, str]:
    """Run one variant through the same stages used by the WebSocket route."""

    async def raise_generation_error(message: str) -> None:
        raise McpGenerationError(message)

    extracted = await ParameterExtractionStage(
        raise_generation_error,
        asset_base_url="",
    ).extract_and_validate(params)
    prompt_messages = await PromptCreationStage(
        raise_generation_error
    ).build_prompt_messages(extracted)
    models = await ModelSelectionStage(raise_generation_error).select_models(
        generation_type=extracted.generation_type,
        input_mode=extracted.input_mode,
        openai_api_key=extracted.openai_api_key,
        anthropic_api_key=extracted.anthropic_api_key,
        gemini_api_key=extracted.gemini_api_key,
    )
    model = models[0]
    variant_errors: list[str] = []

    async def capture_event(
        type: MessageType,
        value: str | None,
        variant_index: int,
        data: dict[str, Any] | None = None,
        event_id: str | None = None,
    ) -> None:
        del variant_index, data, event_id
        if type in {"error", "variantError"} and value:
            variant_errors.append(value)

    stage = AgenticGenerationStage(
        send_message=capture_event,
        openai_api_key=extracted.openai_api_key,
        openai_base_url=extracted.openai_base_url,
        anthropic_api_key=extracted.anthropic_api_key,
        gemini_api_key=extracted.gemini_api_key,
        replicate_api_key=extracted.replicate_api_key,
        should_generate_images=extracted.should_generate_images,
        should_extract_assets=extracted.should_extract_assets,
        file_state=extracted.file_state,
        asset_base_url=extracted.asset_base_url,
        option_codes=extracted.option_codes,
        stack=str(extracted.stack),
        input_mode=str(extracted.input_mode),
        generation_type=extracted.generation_type,
    )
    completions = await stage.process_variants([model], prompt_messages)
    code = completions.get(0)
    if not code:
        detail = variant_errors[-1] if variant_errors else "generation returned no code"
        raise McpGenerationError(f"Screenshot generation failed: {detail}")
    return {"code": code, "model": model.value, "stack": extracted.stack}


async def generate_code_from_screenshot(
    image_path: str,
    stack: Stack = "html_tailwind",
    instructions: str = "",
    design_system: str | None = None,
    generate_images: bool = False,
    extract_assets: bool = False,
) -> dict[str, str]:
    """Generate one frontend code variant from a local screenshot.

    Configure at least one model provider key in backend/.env. The image path is
    resolved on the MCP server host. Image generation and asset extraction are
    opt-in because they can require Replicate or Gemini credentials.
    """
    data_url = screenshot_data_url(image_path)
    params = build_generation_params(
        data_url=data_url,
        stack=stack,
        instructions=instructions,
        design_system=design_system,
        generate_images=generate_images,
        extract_assets=extract_assets,
    )
    return await generate_single_variant(params)


mcp.tool()(generate_code_from_screenshot)


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="127.0.0.1",
        port=_mcp_port(),
        stateless_http=True,
        json_response=True,
    )
