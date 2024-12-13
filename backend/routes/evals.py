import os
from fastapi import APIRouter, Query, Request, HTTPException
from pydantic import BaseModel
from evals.utils import image_to_data_url
from evals.config import EVALS_DIR
from typing import Set
from evals.runner import run_image_evals
from typing import List, Dict
from llm import Llm
from prompts.types import Stack
from pathlib import Path
import base64

router = APIRouter()

# Update this if the number of outputs generated per input changes
N = 1


class Eval(BaseModel):
    input: str
    outputs: list[str]


@router.get("/evals", response_model=list[Eval])
async def get_evals(folder: str):
    if not folder:
        raise HTTPException(status_code=400, detail="Folder path is required")

    folder_path = Path(folder)
    if not folder_path.exists():
        raise HTTPException(status_code=404, detail=f"Folder not found: {folder}")

    try:
        evals: list[Eval] = []
        # Get all HTML files from folder
        files = {
            f: os.path.join(folder, f)
            for f in os.listdir(folder)
            if f.endswith(".html")
        }

        # Extract base names
        base_names: Set[str] = set()
        for filename in files.keys():
            base_name = (
                filename.rsplit("_", 1)[0]
                if "_" in filename
                else filename.replace(".html", "")
            )
            base_names.add(base_name)

        for base_name in base_names:
            input_path = os.path.join(EVALS_DIR, "inputs", f"{base_name}.png")
            if not os.path.exists(input_path):
                continue

            # Find matching output file
            output_file = None
            for filename, filepath in files.items():
                if filename.startswith(base_name):
                    output_file = filepath
                    break

            if output_file:
                input_data = await image_to_data_url(input_path)
                with open(output_file, "r", encoding="utf-8") as f:
                    output_html = f.read()
                evals.append(Eval(input=input_data, outputs=[output_html]))

        return evals

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing evals: {str(e)}")


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


class BestOfNEvalsResponse(BaseModel):
    evals: list[Eval]
    folder_names: list[str]


@router.get("/best-of-n-evals", response_model=BestOfNEvalsResponse)
async def get_best_of_n_evals(request: Request):
    # Get all query parameters
    query_params = dict(request.query_params)

    # Extract all folder paths (folder1, folder2, folder3, etc.)
    folders = []
    i = 1
    while f"folder{i}" in query_params:
        folders.append(query_params[f"folder{i}"])
        i += 1

    if not folders:
        return {"error": "No folders provided"}

    # Validate folders exist
    for folder in folders:
        if not os.path.exists(folder):
            return {"error": f"Folder does not exist: {folder}"}

    evals: list[Eval] = []
    folder_names = [os.path.basename(folder) for folder in folders]

    # Get HTML files from all folders
    files_by_folder = []
    for folder in folders:
        files = {
            f: os.path.join(folder, f)
            for f in os.listdir(folder)
            if f.endswith(".html")
        }
        files_by_folder.append(files)

    # Find common base names across all folders
    common_names: Set[str] = set()
    base_names_first_folder = {
        f.rsplit("_", 1)[0] if "_" in f else f.replace(".html", "")
        for f in files_by_folder[0].keys()
    }

    for base_name in base_names_first_folder:
        found_in_all = True
        for folder_files in files_by_folder[1:]:
            if not any(f.startswith(base_name) for f in folder_files.keys()):
                found_in_all = False
                break
        if found_in_all:
            common_names.add(base_name)

    # For each matching set, create an eval
    for base_name in common_names:
        # Find the corresponding input image
        input_image = None
        input_path = os.path.join(EVALS_DIR, "inputs", f"{base_name}.png")
        if os.path.exists(input_path):
            input_image = await image_to_data_url(input_path)
        else:
            input_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

        # Get HTML contents from all folders
        outputs = []
        for folder_files in files_by_folder:
            output_content = None
            for filename in folder_files.keys():
                if filename.startswith(base_name):
                    with open(folder_files[filename], "r") as f:
                        output_content = f.read()
                    break
            if output_content:
                outputs.append(output_content)
            else:
                outputs.append("<html><body>Output not found</body></html>")

        if len(outputs) == len(folders):  # Only add if we have outputs from all folders
            evals.append(Eval(input=input_image, outputs=outputs))

    return BestOfNEvalsResponse(evals=evals, folder_names=folder_names)
