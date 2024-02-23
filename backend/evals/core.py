import os

from llm import stream_openai_response
from prompts import assemble_prompt
from prompts.types import Stack


async def generate_code_core(image_url: str, stack: Stack) -> str:
    """
    Generate code asynchronously using OpenAI's API.

    Args:
        image_url (str): The URL of the image.
        stack (Stack): The stack (e.g., backend, frontend) for code generation.

    Returns:
        str: The generated code completion.
    """
    prompt_messages = assemble_prompt(image_url, stack)
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    openai_base_url = None

    if not openai_api_key or openai_api_key.strip() == "":
        raise ValueError("OpenAI API key is missing or empty")

    completion = await stream_openai_response(
        prompt_messages,
        api_key=openai_api_key,
        base_url=openai_base_url
    )

    return completion
