# Load environment variables first
from dotenv import load_dotenv

load_dotenv()


import json
import os
import traceback
from datetime import datetime
from fastapi import FastAPI, WebSocket

from llm import stream_openai_response
from mock import MOCK_HTML, mock_completion
from image_generation import generate_images
from prompts import assemble_prompt

app = FastAPI()

# Useful for debugging purposes when you don't want to waste GPT4-Vision credits
# Setting to True will stream a mock response instead of calling the OpenAI API
SHOULD_MOCK_AI_RESPONSE = False


def write_logs(prompt_messages, completion):
    # Create run_logs directory if it doesn't exist
    if not os.path.exists("run_logs"):
        os.makedirs("run_logs")

    # Generate a unique filename using the current timestamp
    filename = datetime.now().strftime("run_logs/messages_%Y%m%d_%H%M%S.json")

    # Write the messages dict into a new file for each run
    with open(filename, "w") as f:
        f.write(json.dumps({"prompt": prompt_messages, "completion": completion}))


@app.websocket("/generate-code")
async def stream_code_test(websocket: WebSocket):
    await websocket.accept()

    params = await websocket.receive_json()

    await websocket.send_json({"type": "status", "value": "Generating code..."})

    async def process_chunk(content):
        await websocket.send_json({"type": "chunk", "value": content})

    prompt_messages = assemble_prompt(params["image"])

    if SHOULD_MOCK_AI_RESPONSE:
        completion = await mock_completion(process_chunk)
    else:
        completion = await stream_openai_response(
            prompt_messages,
            lambda x: process_chunk(x),
        )

    # Write the messages dict into a log so that we can debug later
    write_logs(prompt_messages, completion)

    # Generate images
    await websocket.send_json({"type": "status", "value": "Generating images..."})

    try:
        updated_html = await generate_images(completion)
        await websocket.send_json({"type": "setCode", "value": updated_html})
        await websocket.send_json(
            {"type": "status", "value": "Code generation complete."}
        )
    except Exception as e:
        traceback.print_exc()
        print("Image generation failed", e)
        await websocket.send_json(
            {"type": "status", "value": "Image generation failed but code is complete."}
        )
    finally:
        await websocket.close()
