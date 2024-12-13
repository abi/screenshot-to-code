from typing import Any, Coroutine, List, Optional
import asyncio
import os
from datetime import datetime
from llm import Llm
from prompts.types import Stack
from .core import generate_code_for_image
from .utils import image_to_data_url
from .config import EVALS_DIR


async def run_image_evals(
    stack: Optional[Stack] = None, model: Optional[str] = None, n: int = 1
) -> List[str]:
    INPUT_DIR = EVALS_DIR + "/inputs"
    OUTPUT_DIR = EVALS_DIR + "/outputs"

    # Get all the files in the directory (only grab pngs)
    evals = [f for f in os.listdir(INPUT_DIR) if f.endswith(".png")]

    if not stack:
        raise ValueError("No stack was provided")

    print("User selected stack:", stack)
    print("User selected model:", model)

    # If model is provided as string, convert it to Llm enum
    if not model:
        raise ValueError("No model was provided")

    selected_model = Llm(model)
    print(f"Running evals for {selected_model} model")

    # Create output subfolder with date, model and stack
    today = datetime.now().strftime("%b_%d_%Y")
    output_subfolder = os.path.join(
        OUTPUT_DIR, f"{today}_{selected_model.value}_{stack}"
    )
    os.makedirs(output_subfolder, exist_ok=True)

    tasks: list[Coroutine[Any, Any, str]] = []
    for filename in evals:
        filepath = os.path.join(INPUT_DIR, filename)
        data_url = await image_to_data_url(filepath)
        for n_idx in range(n):  # Generate N tasks for each input
            if n_idx == 0:
                task = generate_code_for_image(
                    image_url=data_url,
                    stack=stack,
                    model=selected_model,
                )
            else:
                task = generate_code_for_image(
                    image_url=data_url, stack=stack, model=Llm.GPT_4O_2024_05_13
                )
            tasks.append(task)

    print(f"Generating {len(tasks)} codes")

    results = await asyncio.gather(*tasks)

    output_files: List[str] = []
    for i, content in enumerate(results):
        # Calculate index for filename and output number
        eval_index = i // n
        output_number = i % n
        filename = evals[eval_index]
        # File name is derived from the original filename in evals with an added output number
        output_filename = f"{os.path.splitext(filename)[0]}_{output_number}.html"
        output_filepath = os.path.join(output_subfolder, output_filename)
        with open(output_filepath, "w") as file:
            file.write(content)
        output_files.append(output_filename)

    return output_files
