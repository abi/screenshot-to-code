# Load environment variables first
from typing import Any, Coroutine
from dotenv import load_dotenv

from eval_config import EVALS_DIR
from eval_utils import image_to_data_url

load_dotenv()

import os
from llm import stream_openai_response
from prompts import assemble_prompt
import asyncio

from utils import pprint_prompt


async def generate_code_core(image_url: str, stack: str) -> str:
    prompt_messages = assemble_prompt(image_url, stack)
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    openai_base_url = None

    pprint_prompt(prompt_messages)

    async def process_chunk(content: str):
        pass

    if not openai_api_key:
        raise Exception("OpenAI API key not found")

    completion = await stream_openai_response(
        prompt_messages,
        api_key=openai_api_key,
        base_url=openai_base_url,
        callback=lambda x: process_chunk(x),
    )

    return completion


async def main():
    INPUT_DIR = EVALS_DIR + "/inputs"
    OUTPUT_DIR = EVALS_DIR + "/outputs"

    # Get all the files in the directory (only grab pngs)
    evals = [f for f in os.listdir(INPUT_DIR) if f.endswith(".png")]

    tasks: list[Coroutine[Any, Any, str]] = []
    for filename in evals:
        filepath = os.path.join(INPUT_DIR, filename)
        data_url = await image_to_data_url(filepath)
        task = generate_code_core(data_url, "html_tailwind")
        tasks.append(task)

    results = await asyncio.gather(*tasks)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename, content in zip(evals, results):
        # File name is derived from the original filename in evals
        output_filename = f"{os.path.splitext(filename)[0]}.html"
        output_filepath = os.path.join(OUTPUT_DIR, output_filename)
        with open(output_filepath, "w") as file:
            file.write(content)


asyncio.run(main())
