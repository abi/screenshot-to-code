from typing import Any, Awaitable, Callable, Coroutine, List, Optional, Tuple
import asyncio
import os
from datetime import datetime
import time
import inspect
from llm import Llm
from prompts.prompt_types import Stack
from .core import generate_code_for_image
from .utils import image_to_data_url
from .config import EVALS_DIR

MAX_EVAL_RETRIES = 2


def _resolve_eval_filenames(input_files: Optional[List[str]]) -> List[str]:
    input_dir = EVALS_DIR + "/inputs"
    if input_files and len(input_files) > 0:
        return [os.path.basename(f) for f in input_files if f.endswith(".png")]
    return [f for f in os.listdir(input_dir) if f.endswith(".png")]


def _output_html_filename(original_filename: str, attempt_idx: int) -> str:
    return f"{os.path.splitext(original_filename)[0]}_{attempt_idx}.html"


def get_eval_output_subfolder(stack: Stack, model: str) -> str:
    today = datetime.now().strftime("%b_%d_%Y")
    output_dir = EVALS_DIR + "/outputs"
    return os.path.join(output_dir, f"{today}_{model}_{stack}")


def count_pending_eval_tasks(
    stack: Stack,
    model: str,
    input_files: Optional[List[str]] = None,
    n: int = 1,
    diff_mode: bool = False,
) -> Tuple[int, int]:
    evals = _resolve_eval_filenames(input_files)
    if not diff_mode:
        return len(evals) * n, 0

    output_subfolder = get_eval_output_subfolder(stack=stack, model=model)
    pending_tasks = 0
    skipped_existing_tasks = 0
    for original_filename in evals:
        for n_idx in range(n):
            output_filename = _output_html_filename(original_filename, n_idx)
            output_path = os.path.join(output_subfolder, output_filename)
            if os.path.exists(output_path):
                skipped_existing_tasks += 1
            else:
                pending_tasks += 1
    return pending_tasks, skipped_existing_tasks


async def generate_code_and_time(
    image_url: str,
    stack: Stack,
    model: Llm,
    original_input_filename: str,
    attempt_idx: int,
) -> Tuple[str, int, Optional[str], Optional[float], Optional[Exception], int]:
    """
    Generates code for an image, measures the time taken, and returns identifiers
    along with success/failure status.
    Returns a tuple:
    (original_input_filename, attempt_idx, content, duration, error_object, retries_used)
    content and duration are None if an error occurs during generation.
    """
    retries_used = 0
    while True:
        start_time = time.perf_counter()
        try:
            content = await generate_code_for_image(
                image_url=image_url, stack=stack, model=model
            )
            end_time = time.perf_counter()
            duration = end_time - start_time
            return (
                original_input_filename,
                attempt_idx,
                content,
                duration,
                None,
                retries_used,
            )
        except Exception as e:
            if retries_used >= MAX_EVAL_RETRIES:
                print(
                    f"Error during code generation for {original_input_filename} "
                    f"(attempt {attempt_idx}, retries exhausted): {e}"
                )
                return (
                    original_input_filename,
                    attempt_idx,
                    None,
                    None,
                    e,
                    retries_used,
                )
            retries_used += 1
            print(
                f"Retrying {original_input_filename} (attempt {attempt_idx}) "
                f"{retries_used}/{MAX_EVAL_RETRIES} after error: {e}"
            )


async def run_image_evals(
    stack: Optional[Stack] = None,
    model: Optional[str] = None,
    n: int = 1,
    input_files: Optional[List[str]] = None,
    diff_mode: bool = False,
    progress_callback: Optional[Callable[[dict[str, Any]], Any | Awaitable[Any]]] = None,
) -> List[str]:
    INPUT_DIR = EVALS_DIR + "/inputs"
    evals = _resolve_eval_filenames(input_files)

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

    output_subfolder = get_eval_output_subfolder(
        stack=stack,
        model=selected_model.value,
    )
    os.makedirs(output_subfolder, exist_ok=True)

    task_coroutines: List[
        Coroutine[
            Any,
            Any,
            Tuple[str, int, Optional[str], Optional[float], Optional[Exception], int],
        ]
    ] = []
    skipped_existing_tasks = 0
    for original_filename in evals:
        # Handle both full paths and relative filenames
        if os.path.isabs(original_filename):
            filepath = original_filename
            original_filename = os.path.basename(original_filename)
        else:
            filepath = os.path.join(INPUT_DIR, original_filename)

        data_url: Optional[str] = None
        for n_idx in range(n):
            output_filename = _output_html_filename(original_filename, n_idx)
            output_path = os.path.join(output_subfolder, output_filename)
            if diff_mode and os.path.exists(output_path):
                skipped_existing_tasks += 1
                continue

            if data_url is None:
                data_url = await image_to_data_url(filepath)
            current_model_for_task = (
                selected_model if n_idx == 0 else Llm.GPT_4_1_2025_04_14
            )
            coro = generate_code_and_time(
                image_url=data_url,
                stack=stack,
                model=current_model_for_task,
                original_input_filename=original_filename,
                attempt_idx=n_idx,
            )
            task_coroutines.append(coro)

    if diff_mode and skipped_existing_tasks > 0:
        print(
            f"Diff mode: skipping {skipped_existing_tasks} existing outputs for "
            f"{selected_model.value}"
        )

    print(f"Processing {len(task_coroutines)} tasks...")
    total_tasks = len(task_coroutines)
    completed_tasks = 0

    output_files: List[str] = []
    timing_data: List[str] = []
    failed_tasks_log: List[str] = []

    async def emit_progress(event: dict[str, Any]) -> None:
        if progress_callback is None:
            return
        maybe_awaitable = progress_callback(event)
        if inspect.isawaitable(maybe_awaitable):
            await maybe_awaitable

    for future in asyncio.as_completed(task_coroutines):
        try:
            (
                task_orig_fn,
                task_attempt_idx,
                generated_content,
                time_taken,
                error_obj,
                retries_used,
            ) = await future
            completed_tasks += 1

            output_html_filename_base = os.path.splitext(task_orig_fn)[0]
            final_output_html_filename = (
                f"{output_html_filename_base}_{task_attempt_idx}.html"
            )
            output_html_filepath = os.path.join(
                output_subfolder, final_output_html_filename
            )

            if error_obj is not None:
                failed_tasks_log.append(
                    f"Input: {task_orig_fn}, Attempt: {task_attempt_idx}, OutputFile: "
                    f"{final_output_html_filename}, Retries: {retries_used}, "
                    f"Error: Generation failed - {str(error_obj)}"
                )
                await emit_progress(
                    {
                        "type": "task_complete",
                        "completed_tasks": completed_tasks,
                        "total_tasks": total_tasks,
                        "input_file": task_orig_fn,
                        "attempt_idx": task_attempt_idx,
                        "success": False,
                        "error": str(error_obj),
                        "retries_used": retries_used,
                    }
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
                    await emit_progress(
                        {
                            "type": "task_complete",
                            "completed_tasks": completed_tasks,
                            "total_tasks": total_tasks,
                            "input_file": task_orig_fn,
                            "attempt_idx": task_attempt_idx,
                            "success": True,
                            "output_file": final_output_html_filename,
                            "duration_seconds": time_taken,
                            "retries_used": retries_used,
                        }
                    )
                except Exception as e_write:
                    failed_tasks_log.append(
                        f"Input: {task_orig_fn}, Attempt: {task_attempt_idx}, OutputFile: {final_output_html_filename}, Error: Writing to file failed - {str(e_write)}"
                    )
                    await emit_progress(
                        {
                            "type": "task_complete",
                            "completed_tasks": completed_tasks,
                            "total_tasks": total_tasks,
                            "input_file": task_orig_fn,
                            "attempt_idx": task_attempt_idx,
                            "success": False,
                            "error": str(e_write),
                        }
                    )
            else:
                failed_tasks_log.append(
                    f"Input: {task_orig_fn}, Attempt: {task_attempt_idx}, OutputFile: {final_output_html_filename}, Error: Unknown issue - content or time_taken is None without explicit error."
                )
                await emit_progress(
                    {
                        "type": "task_complete",
                        "completed_tasks": completed_tasks,
                        "total_tasks": total_tasks,
                        "input_file": task_orig_fn,
                        "attempt_idx": task_attempt_idx,
                        "success": False,
                        "error": "Unknown issue during task processing.",
                    }
                )

        except Exception as e_as_completed:
            print(f"A task in as_completed failed unexpectedly: {e_as_completed}")
            failed_tasks_log.append(
                f"Critical Error: A task processing failed - {str(e_as_completed)}"
            )
            completed_tasks += 1
            await emit_progress(
                {
                    "type": "task_complete",
                    "completed_tasks": completed_tasks,
                    "total_tasks": total_tasks,
                    "input_file": "unknown",
                    "attempt_idx": -1,
                    "success": False,
                    "error": str(e_as_completed),
                }
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
