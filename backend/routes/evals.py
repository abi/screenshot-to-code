import os
from fastapi import APIRouter, Query
from pydantic import BaseModel
from evals.utils import image_to_data_url
from evals.config import EVALS_DIR
from typing import Set
from evals.runner import run_image_evals
from typing import List, Dict
from llm import Llm
from prompts.types import Stack

router = APIRouter()

# Update this if the number of outputs generated per input changes
N = 1


class Eval(BaseModel):
    input: str
    outputs: list[str]


@router.get("/evals")
async def get_evals():
    # Get all evals from EVALS_DIR
    input_dir = EVALS_DIR + "/inputs"
    output_dir = EVALS_DIR + "/outputs"

    evals: list[Eval] = []
    for file in os.listdir(input_dir):
        if file.endswith(".png"):
            input_file_path = os.path.join(input_dir, file)
            input_file = await image_to_data_url(input_file_path)

            # Construct the corresponding output file names
            output_file_names = [
                file.replace(".png", f"_{i}.html") for i in range(0, N)
            ]  # Assuming 3 outputs for each input

            output_files_data: list[str] = []
            for output_file_name in output_file_names:
                output_file_path = os.path.join(output_dir, output_file_name)
                # Check if the output file exists
                if os.path.exists(output_file_path):
                    with open(output_file_path, "r") as f:
                        output_files_data.append(f.read())
                else:
                    output_files_data.append(
                        "<html><h1>Output file not found.</h1></html>"
                    )

            evals.append(
                Eval(
                    input=input_file,
                    outputs=output_files_data,
                )
            )

    return evals


class PairwiseEvalResponse(BaseModel):
    evals: list[Eval]
    folder1_name: str
    folder2_name: str


@router.get("/pairwise-evals", response_model=PairwiseEvalResponse)
async def get_pairwise_evals(
    folder1: str = Query(
        "...",
        description="Absolute path to first folder",
    ),
    folder2: str = Query(
        "..",
        description="Absolute path to second folder",
    ),
):
    if not os.path.exists(folder1) or not os.path.exists(folder2):
        return {"error": "One or both folders do not exist"}

    evals: list[Eval] = []

    # Get all HTML files from first folder
    files1 = {
        f: os.path.join(folder1, f) for f in os.listdir(folder1) if f.endswith(".html")
    }
    files2 = {
        f: os.path.join(folder2, f) for f in os.listdir(folder2) if f.endswith(".html")
    }

    # Find common base names (ignoring any suffixes)
    common_names: Set[str] = set()
    for f1 in files1.keys():
        base_name: str = f1.rsplit("_", 1)[0] if "_" in f1 else f1.replace(".html", "")
        for f2 in files2.keys():
            if f2.startswith(base_name):
                common_names.add(base_name)

    # For each matching pair, create an eval
    for base_name in common_names:
        # Find the corresponding input image
        input_image = None
        input_path = os.path.join(EVALS_DIR, "inputs", f"{base_name}.png")
        if os.path.exists(input_path):
            input_image = await image_to_data_url(input_path)
        else:
            input_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="  # 1x1 transparent PNG

        # Get the HTML contents
        output1 = None
        output2 = None

        # Find matching files in folder1
        for f1 in files1.keys():
            if f1.startswith(base_name):
                with open(files1[f1], "r") as f:
                    output1 = f.read()
                break

        # Find matching files in folder2
        for f2 in files2.keys():
            if f2.startswith(base_name):
                with open(files2[f2], "r") as f:
                    output2 = f.read()
                break

        if output1 and output2:
            evals.append(Eval(input=input_image, outputs=[output1, output2]))

    # Extract folder names for the UI
    folder1_name = os.path.basename(folder1)
    folder2_name = os.path.basename(folder2)

    return PairwiseEvalResponse(
        evals=evals, folder1_name=folder1_name, folder2_name=folder2_name
    )


class RunEvalsRequest(BaseModel):
    models: List[str]
    stack: Stack


@router.post("/run_evals", response_model=List[str])
async def run_evals(request: RunEvalsRequest) -> List[str]:
    """Run evaluations on all images in the inputs directory for multiple models"""
    all_output_files: List[str] = []

    for model in request.models:
        output_files = await run_image_evals(model=model, stack=request.stack)
        all_output_files.extend(output_files)

    return all_output_files


@router.get("/models", response_model=Dict[str, List[str]])
async def get_models():
    current_models = [
        model.value
        for model in Llm
        if model != Llm.GPT_4_TURBO_2024_04_09
        and model != Llm.GPT_4_VISION
        and model != Llm.CLAUDE_3_SONNET
        and model != Llm.CLAUDE_3_OPUS
        and model != Llm.CLAUDE_3_HAIKU
    ]

    # Import Stack type from prompts.types and get all literal values
    available_stacks = list(Stack.__args__)

    return {"models": current_models, "stacks": available_stacks}
