from typing import Optional

from anthropic import AsyncAnthropic
from google import genai
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.anthropic import AnthropicProviderSession, serialize_anthropic_tools
from agent.providers.base import ProviderSession
from agent.providers.gemini import GeminiProviderSession, serialize_gemini_tools
from agent.providers.openai import OpenAIProviderSession, serialize_openai_tools
from agent.tools import canonical_tool_definitions
from config import OPENROUTER_BASE_URL, REPLICATE_API_KEY
from llm import (
    ANTHROPIC_MODELS,
    GEMINI_MODELS,
    OPENAI_MODELS,
    OPENROUTER_MODELS,
    Llm,
    get_openrouter_api_name,
    get_openrouter_reasoning_effort,
)
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
    openrouter_api_key: Optional[str] = None,
    should_extract_assets: bool = True,
) -> ProviderSession:
    canonical_tools = canonical_tool_definitions(
        image_generation_enabled=should_generate_images,
        # The edit_image tool calls Replicate, so don't offer it without a key.
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
        return OpenAIProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_openai_tools(canonical_tools),
        )

    if model in OPENROUTER_MODELS:
        if not openrouter_api_key:
            raise Exception("OpenRouter API key is missing.")

        client = AsyncOpenAI(
            api_key=openrouter_api_key,
            base_url=OPENROUTER_BASE_URL,
        )
        return OpenAIProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_openai_tools(canonical_tools),
            provider_name="openrouter",
            api_model_name=get_openrouter_api_name(model),
            reasoning_effort=get_openrouter_reasoning_effort(model),
            # OpenRouter pre-authorizes against this ceiling. Keep Kimi below
            # the common prepaid-credit limit while retaining ample HTML room.
            max_output_tokens=20000,
        )

    if model in ANTHROPIC_MODELS:
        if not anthropic_api_key:
            raise Exception("Anthropic API key is missing.")

        client = AsyncAnthropic(api_key=anthropic_api_key)
        return AnthropicProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_anthropic_tools(canonical_tools),
        )

    if model in GEMINI_MODELS:
        if not gemini_api_key:
            raise Exception("Gemini API key is missing.")

        client = genai.Client(api_key=gemini_api_key)
        return GeminiProviderSession(
            client=client,
            model=model,
            prompt_messages=prompt_messages,
            tools=serialize_gemini_tools(canonical_tools),
        )

    raise ValueError(f"Unsupported model: {model.value}")
