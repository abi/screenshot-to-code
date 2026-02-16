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
from llm import ANTHROPIC_MODELS, GEMINI_MODELS, OPENAI_MODELS, Llm


def create_provider_session(
    model: Llm,
    prompt_messages: list[ChatCompletionMessageParam],
    should_generate_images: bool,
    openai_api_key: Optional[str],
    openai_base_url: Optional[str],
    anthropic_api_key: Optional[str],
    gemini_api_key: Optional[str],
) -> ProviderSession:
    canonical_tools = canonical_tool_definitions(
        image_generation_enabled=should_generate_images
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
