# Load environment variables first
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


import json
import os
import traceback
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from llm import stream_openai_response
from mock import mock_completion
from image_generation import create_alt_url_mapping, generate_images
from prompts import assemble_prompt
from routes import screenshot

app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)

# Configure CORS

# Configure CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Useful for debugging purposes when you don't want to waste GPT4-Vision credits
# Setting to True will stream a mock response instead of calling the OpenAI API
SHOULD_MOCK_AI_RESPONSE = False


app.include_router(screenshot.router)


def write_logs(prompt_messages, completion):
    # Get the logs path from environment, default to the current working directory
    logs_path = os.environ.get("LOGS_PATH", os.getcwd())

    # Create run_logs directory if it doesn't exist within the specified logs path
    logs_directory = os.path.join(logs_path, "run_logs")
    if not os.path.exists(logs_directory):
        os.makedirs(logs_directory)

    print("Writing to logs directory:", logs_directory)

    # Generate a unique filename using the current timestamp within the logs directory
    filename = datetime.now().strftime(f"{logs_directory}/messages_%Y%m%d_%H%M%S.json")

    # Write the messages dict into a new file for each run
    with open(filename, "w") as f:
        f.write(json.dumps({"prompt": prompt_messages, "completion": completion}))


@app.websocket("/generate-code")
async def stream_code(websocket: WebSocket):
    await websocket.accept()

    params = await websocket.receive_json()

    # Get the OpenAI API key from the request. Fall back to environment variable if not provided.
    # If neither is provided, we throw an error.
    if params["openAiApiKey"]:
        openai_api_key = params["openAiApiKey"]
        print("Using OpenAI API key from client-side settings dialog")
    else:
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        if openai_api_key:
            print("Using OpenAI API key from environment variable")

    if not openai_api_key:
        print("OpenAI API key not found")
        await websocket.send_json(
            {
                "type": "error",
                "value": "No OpenAI API key found. Please add your API key in the settings dialog or add it to backend/.env file.",
            }
        )
        return

    should_generate_images = (
        params["isImageGenerationEnabled"]
        if "isImageGenerationEnabled" in params
        else True
    )

    print("generating code...")
    await websocket.send_json({"type": "status", "value": "Generating code..."})

    async def process_chunk(content):
        await websocket.send_json({"type": "chunk", "value": content})

    prompt_messages = assemble_prompt(params["image"])

    # Image cache for updates so that we don't have to regenerate images
    image_cache = {}

    if params["generationType"] == "update":
        # Transform into message format
        # TODO: Move this to frontend
        for index, text in enumerate(params["history"]):
            prompt_messages += [
                {"role": "assistant" if index % 2 == 0 else "user", "content": text}
            ]

        image_cache = create_alt_url_mapping(params["history"][-2])

    if SHOULD_MOCK_AI_RESPONSE:
        completion = await mock_completion(process_chunk)
    else:
        completion = await stream_openai_response(
            prompt_messages,
            api_key=openai_api_key,
            callback=lambda x: process_chunk(x),
        )

    # Write the messages dict into a log so that we can debug later
    write_logs(prompt_messages, completion)

    try:
        if should_generate_images:
            await websocket.send_json(
                {"type": "status", "value": "Generating images..."}
            )
            updated_html = await generate_images(
                completion, api_key=openai_api_key, image_cache=image_cache
            )
        else:
            updated_html = completion
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
