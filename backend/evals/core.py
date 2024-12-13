from config import ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
from llm import (
    Llm,
    stream_claude_response,
    stream_gemini_response,
    stream_openai_response,
)
from prompts import assemble_prompt
from prompts.types import Stack
from openai.types.chat import ChatCompletionMessageParam


async def generate_code_for_image(image_url: str, stack: Stack, model: Llm) -> str:
    prompt_messages = assemble_prompt(image_url, stack)
    return await generate_code_core(prompt_messages, model)


async def generate_code_core(
    prompt_messages: list[ChatCompletionMessageParam], model: Llm
) -> str:

    async def process_chunk(_: str):
        pass

    if (
        model == Llm.CLAUDE_3_SONNET
        or model == Llm.CLAUDE_3_5_SONNET_2024_06_20
        or model == Llm.CLAUDE_3_5_SONNET_2024_10_22
    ):
        if not ANTHROPIC_API_KEY:
            raise Exception("Anthropic API key not found")

        completion = await stream_claude_response(
            prompt_messages,
            api_key=ANTHROPIC_API_KEY,
            callback=lambda x: process_chunk(x),
            model=model,
        )
    elif model == Llm.GEMINI_2_0_FLASH_EXP:
        if not GEMINI_API_KEY:
            raise Exception("Gemini API key not found")

        completion = await stream_gemini_response(
            prompt_messages,
            api_key=GEMINI_API_KEY,
            callback=lambda x: process_chunk(x),
            model=model,
        )
    else:
        if not OPENAI_API_KEY:
            raise Exception("OpenAI API key not found")

        completion = await stream_openai_response(
            prompt_messages,
            api_key=OPENAI_API_KEY,
            base_url=None,
            callback=lambda x: process_chunk(x),
            model=model,
        )

    return completion
