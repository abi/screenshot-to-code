from typing import Any, Coroutine, List, Optional, Tuple
import asyncio
import os
from datetime import datetime
import time
from llm import Llm
from prompts.types import Stack
from .core import generate_code_for_image
from .utils import image_to_data_url
from .config import EVALS_DIR


async def generate_code_and_time(
    image_url: str,
    stack: Stack,
    model: Llm,
    original_input_filename: str,
    attempt_idx: int,
) -> Tuple[str, int, Optional[str], Optional[float], Optional[Exception]]:
    """
    Generates code for an image, measures the time taken, and returns identifiers
    along with success/failure status.
    Returns a tuple: (original_input_filename, attempt_idx, content, duration, error_object)
    content and duration are None if an error occurs during generation.
    """
    start_time = time.perf_counter()
    try:
        content = await generate_code_for_image(
            image_url=image_url, stack=stack, model=model
        )
        end_time = time.perf_counter()
        duration = end_time - start_time
        return original_input_filename, attempt_idx, content, duration, None
    except Exception as e:
        print(
            f"Error during code generation for {original_input_filename} (attempt {attempt_idx}): {e}"
        )
        return original_input_filename, attempt_idx, None, None, e


async def run_image_evals(
    stack: Optional[Stack] = None, 
    model: Optional[str] = None, 
    n: int = 1,
    input_files: Optional[List[str]] = None
) -> List[str]:
    INPUT_DIR = EVALS_DIR + "/inputs"
    OUTPUT_DIR = EVALS_DIR + "/outputs"

    # Get all evaluation image files
    if input_files and len(input_files) > 0:
        # Use the explicitly provided file list
        evals = [os.path.basename(f) for f in input_files if f.endswith(".png")]
    else:
        # Use all PNG files from the input directory
        evals = [f for f in os.listdir(INPUT_DIR) if f.endswith(".png")]

    if not stack:
        raise ValueError("No stack was provided")
    if not model:
        raise ValueError("No model was provided")

    print("User selected stack:", stack)
    print("User selected model:", model)
    selected_model = Llm(model)
    print(f"Running evals for {selected_model.value} model")
    
    if input_files and len(input_files) > 0:
        print(f"Running on {len(evals)} selected files")
    else:
        print(f"Running on all {len(evals)} files in {INPUT_DIR}")

    today = datetime.now().strftime("%b_%d_%Y")
    output_subfolder = os.path.join(
        OUTPUT_DIR, f"{today}_{selected_model.value}_{stack}"
    )
    os.makedirs(output_subfolder, exist_ok=True)

    task_coroutines: List[
        Coroutine[
            Any,
            Any,
            Tuple[str, int, Optional[str], Optional[float], Optional[Exception]],
        ]
    ] = []
    for original_filename in evals:
        # Handle both full paths and relative filenames
        if os.path.isabs(original_filename):
            filepath = original_filename
            original_filename = os.path.basename(original_filename)
        else:
            filepath = os.path.join(INPUT_DIR, original_filename)
            
        data_url = await image_to_data_url(filepath)
        for n_idx in range(n):
            current_model_for_task = (
                selected_model if n_idx == 0 else Llm.GPT_4O_2024_05_13
            )
            coro = generate_code_and_time(
                image_url=data_url,
                stack=stack,
                model=current_model_for_task,
                original_input_filename=original_filename,
                attempt_idx=n_idx,
            )
            task_coroutines.append(coro)

    print(f"Processing {len(task_coroutines)} tasks...")

    output_files: List[str] = []
    timing_data: List[str] = []
    failed_tasks_log: List[str] = []

    for future in asyncio.as_completed(task_coroutines):
        try:
            task_orig_fn, task_attempt_idx, generated_content, time_taken, error_obj = (
                await future
            )

            output_html_filename_base = os.path.splitext(task_orig_fn)[0]
            final_output_html_filename = (
                f"{output_html_filename_base}_{task_attempt_idx}.html"
            )
            output_html_filepath = os.path.join(
                output_subfolder, final_output_html_filename
            )

            if error_obj is not None:
                failed_tasks_log.append(
                    f"Input: {task_orig_fn}, Attempt: {task_attempt_idx}, OutputFile: {final_output_html_filename}, Error: Generation failed - {str(error_obj)}"
                )
            elif generated_content is not None and time_taken is not None:
                try:
                    with open(output_html_filepath, "w") as file:
                        file.write(generated_content)
                    timing_data.append(
                        f"{final_output_html_filename}: {time_taken:.2f} seconds"
                    )
                    output_files.append(final_output_html_filename)
                    print(
                        f"Successfully processed and wrote {final_output_html_filename}"
                    )
                except Exception as e_write:
                    failed_tasks_log.append(
                        f"Input: {task_orig_fn}, Attempt: {task_attempt_idx}, OutputFile: {final_output_html_filename}, Error: Writing to file failed - {str(e_write)}"
                    )
            else:
                failed_tasks_log.append(
                    f"Input: {task_orig_fn}, Attempt: {task_attempt_idx}, OutputFile: {final_output_html_filename}, Error: Unknown issue - content or time_taken is None without explicit error."
                )

        except Exception as e_as_completed:
            print(f"A task in as_completed failed unexpectedly: {e_as_completed}")
            failed_tasks_log.append(
                f"Critical Error: A task processing failed - {str(e_as_completed)}"
            )

    # Write timing data for successful tasks
    if timing_data:
        timing_file_path = os.path.join(output_subfolder, "generation_times.txt")
        try:
            is_new_or_empty_file = (
                not os.path.exists(timing_file_path)
                or os.path.getsize(timing_file_path) == 0
            )

            with open(timing_file_path, "a") as file:
                if is_new_or_empty_file:
                    file.write(f"Model: {selected_model.value}\n")
                elif timing_data:
                    file.write("\n")

                file.write("\n".join(timing_data))
            print(f"Timing data saved to {timing_file_path}")
        except Exception as e:
            print(f"Error writing timing file {timing_file_path}: {e}")

    # Write log for failed tasks
    if failed_tasks_log:
        failed_log_path = os.path.join(output_subfolder, "failed_tasks.txt")
        try:
            with open(failed_log_path, "w") as file:
                file.write("\n".join(failed_tasks_log))
            print(f"Failed tasks log saved to {failed_log_path}")
        except Exception as e:
            print(f"Error writing failed tasks log {failed_log_path}: {e}")

    return output_files
