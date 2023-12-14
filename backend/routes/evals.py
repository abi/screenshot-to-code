import os
from fastapi import APIRouter
from pydantic import BaseModel
from eval_utils import image_to_data_url
from eval_config import EVALS_DIR


router = APIRouter()


class Eval(BaseModel):
    input: str
    output: str


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

            # Construct the corresponding output file name
            output_file_name = file.replace(".png", ".html")
            output_file_path = os.path.join(output_dir, output_file_name)

            # Check if the output file exists
            if os.path.exists(output_file_path):
                with open(output_file_path, "r") as f:
                    output_file_data = f.read()
            else:
                output_file_data = "Output file not found."

            evals.append(
                Eval(
                    input=input_file,
                    output=output_file_data,
                )
            )

    return evals
