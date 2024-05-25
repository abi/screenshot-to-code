import os
from config import CFG_ANTHROPIC_API_KEY,CFG_ANTHROPIC_BASE_URL,CFG_OPENAI_API_KEY,CFG_OPENAI_BASE_URL

from llm import Llm, stream_claude_response, stream_openai_response
from prompts import assemble_prompt
from prompts.types import Stack


async def generate_code_core(image_url: str, stack: Stack, model: Llm) -> str:
    prompt_messages = assemble_prompt(image_url, stack)

    async def process_chunk(content: str):
        pass

    if model == Llm.CLAUDE_3_SONNET:
        if not CFG_ANTHROPIC_API_KEY:
            raise Exception("Anthropic API key not found")

        completion = await stream_claude_response(
            prompt_messages,
            api_key=CFG_ANTHROPIC_API_KEY,
            callback=lambda x: process_chunk(x),
            base_url=CFG_ANTHROPIC_BASE_URL
        )
    else:
        if not CFG_OPENAI_API_KEY:
            raise Exception("OpenAI API key not found")

        completion = await stream_openai_response(
            prompt_messages,
            api_key=CFG_OPENAI_API_KEY,
            base_url=CFG_OPENAI_BASE_URL,
            callback=lambda x: process_chunk(x),
            model=model,
        )

    return completion
