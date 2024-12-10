# Load environment variables first
from dotenv import load_dotenv

load_dotenv()

import asyncio
from evals.runner import run_image_evals


async def main():
    await run_image_evals()


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

if __name__ == "__main__":
    asyncio.run(main())
