from __future__ import annotations

from typing import Optional

from anthropic import AsyncAnthropic
from google import genai
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.modes import ANTHROPIC_TOOL_NUDGE, OPENAI_TOOL_CHOICE, StructuredOutputMode
from agent.providers.anthropic import AnthropicProviderSession, serialize_anthropic_tools
from agent.providers.base import ProviderSession
from agent.providers.gemini import GeminiProviderSession, serialize_gemini_tools
from agent.providers.openai import OpenAIProviderSession, serialize_openai_tools
from agent.tools import canonical_tool_definitions
from config import REPLICATE_API_KEY
from fs_logging.agent_runs import AgentRunRecorder
from llm import ANTHROPIC_MODELS, GEMINI_MODELS, OPENAI_MODELS, Llm
from preview_screenshot import is_screenshot_preview_available


def create_provider_session(
    model: Llm,
    prompt_messages: list[ChatCompletionMessageParam],
    should_generate_images: bool,
    openai_api_key: Optional[str],
    openai_base_url: Optional[str],
    anthropic_api_key: Optional[str],
    gemini_api_key: Optional[str],
    replicate_api_key: Optional[str],
    should_extract_assets: bool = True,
    recorder: Optional[AgentRunRecorder] = None,
    structured_output_mode: StructuredOutputMode | None = None,
) -> ProviderSession:
    canonical_tools = canonical_tool_definitions(
        image_generation_enabled=should_generate_images,
        # The edit_images tool calls Replicate, so don't offer it without a key.
        image_editing_enabled=bool(replicate_api_key or REPLICATE_API_KEY),
        # The extract_assets tool calls Gemini, so don't offer it without a key.
        asset_extraction_enabled=should_extract_assets and bool(gemini_api_key),
        # screenshot_preview needs headless Chromium; skip it if it can't launch.
        screenshot_enabled=is_screenshot_preview_available(),
    )

    if model in OPENAI_MODELS:
        if not openai_api_key:
            raise Exception("OpenAI API key is missing.")

        client = AsyncOpenAI(api_key=openai_api_key, base_url=openai_base_url)
        tool_choice: str | None = (
            OPENAI_TOOL_CHOICE[structured_output_mode]  # type: ignore[index]
            if structured_output_mode is not None
            else "auto"
        )
        return OpenAIProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_openai_tools(canonical_tools),
            recorder=recorder,
            tool_choice=tool_choice,
        )

    if model in ANTHROPIC_MODELS:
        if not anthropic_api_key:
            raise Exception("Anthropic API key is missing.")

        client = AsyncAnthropic(api_key=anthropic_api_key)
        # Anthropic has no "force tool" API knob; we inject a system nudge instead.
        tool_nudge: str | None = (
            ANTHROPIC_TOOL_NUDGE[structured_output_mode]  # type: ignore[index]
            if structured_output_mode is not None
            else None
        )
        return AnthropicProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_anthropic_tools(canonical_tools),
            recorder=recorder,
            tool_nudge=tool_nudge,
        )

    if model in GEMINI_MODELS:
        if not gemini_api_key:
            raise Exception("Gemini API key is missing.")

        client = genai.Client(api_key=gemini_api_key)
        # Gemini tool-calling is all-or-nothing via forced_function_calling;
        # map "force_tool" to the only available mode.
        return GeminiProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_gemini_tools(canonical_tools),
            recorder=recorder,
        )

    raise ValueError(f"Unsupported model: {model.value}")
