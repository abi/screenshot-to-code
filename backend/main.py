# Load environment variables first
from dotenv import load_dotenv

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
from access_token import validate_access_token

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
# TODO: Should only be set to true when value is 'True', not any abitrary truthy value
SHOULD_MOCK_AI_RESPONSE = bool(os.environ.get("MOCK", False))


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

    print("Incoming websocket connection...")

    params = await websocket.receive_json()

    print("Received params")

    # Read the code config settings from the request. Fall back to default if not provided.
    generated_code_config = ""
    if "generatedCodeConfig" in params and params["generatedCodeConfig"]:
        generated_code_config = params["generatedCodeConfig"]
    print(f"Generating {generated_code_config} code")

    # Get the OpenAI API key from the request. Fall back to environment variable if not provided.
    # If neither is provided, we throw an error.
    openai_api_key = None
    if "accessCode" in params and params["accessCode"]:
        print("Access code - using platform API key")
        if await validate_access_token(params["accessCode"]):
            openai_api_key = os.environ.get("PLATFORM_OPENAI_API_KEY")
        else:
            await websocket.send_json(
                {
                    "type": "error",
                    "value": "Invalid access code or you're out of credits. Please try again.",
                }
            )
            return
    else:
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

    # Get the OpenAI Base URL from the request. Fall back to environment variable if not provided.
    openai_base_url = None
    # Disable user-specified OpenAI Base URL in prod
    if not os.environ.get("IS_PROD"):
        if "openAiBaseURL" in params and params["openAiBaseURL"]:
            openai_base_url = params["openAiBaseURL"]
            print("Using OpenAI Base URL from client-side settings dialog")
        else:
            openai_base_url = os.environ.get("OPENAI_BASE_URL")
            if openai_base_url:
                print("Using OpenAI Base URL from environment variable")

    if not openai_base_url:
        print("Using official OpenAI URL")

    # Get the image generation flag from the request. Fall back to True if not provided.
    should_generate_images = (
        params["isImageGenerationEnabled"]
        if "isImageGenerationEnabled" in params
        else True
    )

    print("generating code...")
    await websocket.send_json({"type": "status", "value": "Generating code..."})

    async def process_chunk(content):
        await websocket.send_json({"type": "chunk", "value": content})

    # Assemble the prompt
    try:
        if params.get("resultImage") and params["resultImage"]:
            prompt_messages = assemble_prompt(
                params["image"], generated_code_config, params["resultImage"]
            )
        else:
            prompt_messages = assemble_prompt(params["image"], generated_code_config)
    except:
        await websocket.send_json(
            {
                "type": "error",
                "value": "Error assembling prompt. Contact support at support@picoapps.xyz",
            }
        )
        await websocket.close()
        return

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
            base_url=openai_base_url,
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
                completion,
                api_key=openai_api_key,
                base_url=openai_base_url,
                image_cache=image_cache,
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
