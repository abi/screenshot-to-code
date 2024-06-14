import os
from fastapi import APIRouter
from pydantic import BaseModel
from evals.utils import image_to_data_url
from evals.config import EVALS_DIR


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
