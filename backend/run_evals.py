# Load environment variables first
from dotenv import load_dotenv

from llm import Llm

load_dotenv()

import os
from typing import Any, Coroutine
import asyncio

from evals.config import EVALS_DIR
from evals.core import generate_code_for_image
from evals.utils import image_to_data_url

STACK = "html_tailwind"
# MODEL = Llm.CLAUDE_3_5_SONNET_2024_06_20
N = 2  # Number of outputs to generate


async def main():
    INPUT_DIR = EVALS_DIR + "/inputs"
    OUTPUT_DIR = EVALS_DIR + "/outputs"

    # Get all the files in the directory (only grab pngs)
    evals = [f for f in os.listdir(INPUT_DIR) if f.endswith(".png")]

    tasks: list[Coroutine[Any, Any, str]] = []
    for filename in evals:
        filepath = os.path.join(INPUT_DIR, filename)
        data_url = await image_to_data_url(filepath)
        for n in range(N):  # Generate N tasks for each input
            if n == 0:
                task = generate_code_for_image(
                    image_url=data_url,
                    stack=STACK,
                    model=Llm.CLAUDE_3_5_SONNET_2024_06_20,
                )
            else:
                task = generate_code_for_image(
                    image_url=data_url, stack=STACK, model=Llm.GPT_4O_2024_05_13
                )
            tasks.append(task)

    print(f"Generating {len(tasks)} codes")

    results = await asyncio.gather(*tasks)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for i, content in enumerate(results):
        # Calculate index for filename and output number
        eval_index = i // N
        output_number = i % N
        filename = evals[eval_index]
        # File name is derived from the original filename in evals with an added output number
        output_filename = f"{os.path.splitext(filename)[0]}_{output_number}.html"
        output_filepath = os.path.join(OUTPUT_DIR, output_filename)
        with open(output_filepath, "w") as file:
            file.write(content)


# async def text_main():
#     OUTPUT_DIR = EVALS_DIR + "/outputs"

#     GENERAL_TEXT_V1 = [
#         "Login form",
#         "Simple notification",
#         "button",
#         "saas dashboard",
#         "landing page for barber shop",
#     ]

#     tasks: list[Coroutine[Any, Any, str]] = []
#     for prompt in GENERAL_TEXT_V1:
#         for n in range(N):  # Generate N tasks for each input
#             if n == 0:
#                 task = generate_code_for_text(
#                     text=prompt,
#                     stack=STACK,
#                     model=Llm.CLAUDE_3_5_SONNET_2024_06_20,
#                 )
#             else:
#                 task = generate_code_for_text(
#                     text=prompt, stack=STACK, model=Llm.GPT_4O_2024_05_13
#                 )
#             tasks.append(task)

#     print(f"Generating {len(tasks)} codes")

#     results = await asyncio.gather(*tasks)

#     os.makedirs(OUTPUT_DIR, exist_ok=True)

#     for i, content in enumerate(results):
#         # Calculate index for filename and output number
#         eval_index = i // N
#         output_number = i % N
#         filename = GENERAL_TEXT_V1[eval_index]
#         # File name is derived from the original filename in evals with an added output number
#         output_filename = f"{os.path.splitext(filename)[0]}_{output_number}.html"
#         output_filepath = os.path.join(OUTPUT_DIR, output_filename)
#         with open(output_filepath, "w") as file:
#             file.write(content)


asyncio.run(main())
