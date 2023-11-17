from datetime import datetime
import json
import os
import traceback
from fastapi import FastAPI, WebSocket
from dotenv import load_dotenv

from llm import stream_openai_response
from mock import mock_completion
from image_generation import create_alt_url_mapping, generate_images
from prompts import assemble_prompt


app = FastAPI()
load_dotenv()


def get_openai_api_key(params):
    return params.get("openAiApiKey") or os.environ.get("OPENAI_API_KEY")


def create_logs_directory(logs_path):
    logs_directory = os.path.join(logs_path, "run_logs")
    if not os.path.exists(logs_directory):
        os.makedirs(logs_directory)
    return logs_directory


def write_logs(logs_directory, prompt_messages, completion):
    filename = datetime.now().strftime(f"{logs_directory}/messages_%Y%m%d_%H%M%S.json")
    with open(filename, "w") as f:
        f.write(json.dumps({"prompt": prompt_messages, "completion": completion}))


async def send_status_message(websocket, message):
    await websocket.send_json({"type": "status", "value": message})


async def process_chunk(websocket, content):
    await websocket.send_json({"type": "chunk", "value": content})


async def generate_code(websocket, params, openai_api_key):
    should_generate_images = params.get("isImageGenerationEnabled", True)
    await send_status_message(websocket, "Generating code...")

    prompt_messages = assemble_prompt(params["image"])
    image_cache = {}

    if params["generationType"] == "update":
        for index, text in enumerate(params["history"]):
            prompt_messages += [
                {"role": "assistant" if index % 2 == 0 else "user", "content": text}
            ]
        image_cache = create_alt_url_mapping(params["history"][-2])

    if SHOULD_MOCK_AI_RESPONSE:
        completion = await mock_completion(lambda x: process_chunk(websocket, x))
    else:
        completion = await stream_openai_response(
            prompt_messages, api_key=openai_api_key, callback=lambda x: process_chunk(websocket, x)
        )

    logs_directory = create_logs_directory(os.environ.get("LOGS_PATH", os.getcwd()))
    write_logs(logs_directory, prompt_messages, completion)

    try:
        if should_generate_images:
            await send_status_message(websocket, "Generating images...")
            updated_html = await generate_images(completion, api_key=openai_api_key, image_cache=image_cache)
        else:
            updated_html = completion

        await websocket.send_json({"type": "setCode", "value": updated_html})
        await send_status_message(websocket, "Code generation complete.")

    except Exception as e:
        traceback.print_exc()
        print("Image generation failed", e)
        await send_status_message(websocket, "Image generation failed but code is complete.")

    finally:
        await websocket.close()


@app.websocket("/generate-code")
async def stream_code_test(websocket: WebSocket):
    await websocket.accept()
    params = await websocket.receive_json()

    openai_api_key = get_openai_api_key(params)
    if not openai_api_key:
        await websocket.send_json(
            {
                "type": "error",
                "value": "No OpenAI API key found. Please add your API key in the settings dialog or add it to backend/.env file.",
            }
        )
        return

    await generate_code(websocket, params, openai_api_key)
