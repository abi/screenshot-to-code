import os
import traceback
from fastapi import APIRouter, WebSocket
import openai
from config import ANTHROPIC_API_KEY, IS_PROD, SHOULD_MOCK_AI_RESPONSE
from custom_types import InputMode
from llm import (
    CODE_GENERATION_MODELS,
    Llm,
    stream_claude_response,
    stream_claude_response_native,
    stream_openai_response,
)
from openai.types.chat import ChatCompletionMessageParam
from mock_llm import mock_completion
from typing import Dict, List, cast, get_args
from image_generation import create_alt_url_mapping, generate_images
from prompts import assemble_imported_code_prompt, assemble_prompt
from access_token import validate_access_token
from datetime import datetime
import json
from prompts.claude_prompts import VIDEO_PROMPT
from prompts.types import Stack

# from utils import pprint_prompt
from video.utils import extract_tag_content, assemble_claude_prompt_video
from ws.constants import APP_ERROR_WEB_SOCKET_CODE  # type: ignore


router = APIRouter()


def write_logs(prompt_messages: List[ChatCompletionMessageParam], completion: str):
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


@router.websocket("/generate-code")
async def stream_code(websocket: WebSocket):
    await websocket.accept()

    print("Incoming websocket connection...")

    async def throw_error(
        message: str,
    ):
        await websocket.send_json({"type": "error", "value": message})
        await websocket.close(APP_ERROR_WEB_SOCKET_CODE)

    # TODO: Are the values always strings?
    params: Dict[str, str] = await websocket.receive_json()

    print("Received params")

    # Read the code config settings from the request. Fall back to default if not provided.
    generated_code_config = ""
    if "generatedCodeConfig" in params and params["generatedCodeConfig"]:
        generated_code_config = params["generatedCodeConfig"]
    if not generated_code_config in get_args(Stack):
        await throw_error(f"Invalid generated code config: {generated_code_config}")
        return
    # Cast the variable to the Stack type
    valid_stack = cast(Stack, generated_code_config)

    # Validate the input mode
    input_mode = params.get("inputMode")
    if not input_mode in get_args(InputMode):
        await throw_error(f"Invalid input mode: {input_mode}")
        raise Exception(f"Invalid input mode: {input_mode}")
    # Cast the variable to the right type
    validated_input_mode = cast(InputMode, input_mode)

    # Read the model from the request. Fall back to default if not provided.
    code_generation_model = params.get("codeGenerationModel", "gpt_4_vision")
    if code_generation_model not in CODE_GENERATION_MODELS:
        await throw_error(f"Invalid model: {code_generation_model}")
        raise Exception(f"Invalid model: {code_generation_model}")
    exact_llm_version = None

    print(
        f"Generating {generated_code_config} code for uploaded {input_mode} using {code_generation_model} model..."
    )

    # Get the OpenAI API key from the request. Fall back to environment variable if not provided.
    # If neither is provided, we throw an error.
    openai_api_key = None
    if "accessCode" in params and params["accessCode"]:
        print("Access code - using platform API key")
        res = await validate_access_token(params["accessCode"])
        if res["success"]:
            openai_api_key = os.environ.get("PLATFORM_OPENAI_API_KEY")
        else:
            await websocket.send_json(
                {
                    "type": "error",
                    "value": res["failure_reason"],
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

    if not openai_api_key and code_generation_model == "gpt_4_vision":
        print("OpenAI API key not found")
        await throw_error(
            "No OpenAI API key found. Please add your API key in the settings dialog or add it to backend/.env file. If you add it to .env, make sure to restart the backend server."
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

    async def process_chunk(content: str):
        await websocket.send_json({"type": "chunk", "value": content})

    # Image cache for updates so that we don't have to regenerate images
    image_cache: Dict[str, str] = {}

    # If this generation started off with imported code, we need to assemble the prompt differently
    if params.get("isImportedFromCode") and params["isImportedFromCode"]:
        original_imported_code = params["history"][0]
        prompt_messages = assemble_imported_code_prompt(
            original_imported_code, valid_stack
        )
        for index, text in enumerate(params["history"][1:]):
            if index % 2 == 0:
                message: ChatCompletionMessageParam = {
                    "role": "user",
                    "content": text,
                }
            else:
                message: ChatCompletionMessageParam = {
                    "role": "assistant",
                    "content": text,
                }
            prompt_messages.append(message)
    else:
        # Assemble the prompt
        try:
            if params.get("resultImage") and params["resultImage"]:
                prompt_messages = assemble_prompt(
                    params["image"], valid_stack, params["resultImage"]
                )
            else:
                prompt_messages = assemble_prompt(params["image"], valid_stack)
        except:
            await websocket.send_json(
                {
                    "type": "error",
                    "value": "Error assembling prompt. Contact support at support@picoapps.xyz",
                }
            )
            await websocket.close()
            return

        if params["generationType"] == "update":
            # Transform the history tree into message format
            # TODO: Move this to frontend
            for index, text in enumerate(params["history"]):
                if index % 2 == 0:
                    message: ChatCompletionMessageParam = {
                        "role": "assistant",
                        "content": text,
                    }
                else:
                    message: ChatCompletionMessageParam = {
                        "role": "user",
                        "content": text,
                    }
                prompt_messages.append(message)

            image_cache = create_alt_url_mapping(params["history"][-2])

    if validated_input_mode == "video":
        video_data_url = params["image"]
        prompt_messages = await assemble_claude_prompt_video(video_data_url)

    # pprint_prompt(prompt_messages)  # type: ignore

    if SHOULD_MOCK_AI_RESPONSE:
        completion = await mock_completion(
            process_chunk, input_mode=validated_input_mode
        )
    else:
        try:
            if validated_input_mode == "video":
                if not ANTHROPIC_API_KEY:
                    await throw_error(
                        "Video only works with Anthropic models. No Anthropic API key found. Please add the environment variable ANTHROPIC_API_KEY to backend/.env"
                    )
                    raise Exception("No Anthropic key")

                completion = await stream_claude_response_native(
                    system_prompt=VIDEO_PROMPT,
                    messages=prompt_messages,  # type: ignore
                    api_key=ANTHROPIC_API_KEY,
                    callback=lambda x: process_chunk(x),
                    model=Llm.CLAUDE_3_OPUS,
                    include_thinking=True,
                )
                exact_llm_version = Llm.CLAUDE_3_OPUS
            elif code_generation_model == "claude_3_sonnet":
                if not ANTHROPIC_API_KEY:
                    await throw_error(
                        "No Anthropic API key found. Please add the environment variable ANTHROPIC_API_KEY to backend/.env"
                    )
                    raise Exception("No Anthropic key")

                completion = await stream_claude_response(
                    prompt_messages,  # type: ignore
                    api_key=ANTHROPIC_API_KEY,
                    callback=lambda x: process_chunk(x),
                )
                exact_llm_version = Llm.CLAUDE_3_SONNET
            else:
                completion = await stream_openai_response(
                    prompt_messages,  # type: ignore
                    api_key=openai_api_key,
                    base_url=openai_base_url,
                    callback=lambda x: process_chunk(x),
                )
                exact_llm_version = Llm.GPT_4_VISION
        except openai.AuthenticationError as e:
            print("[GENERATE_CODE] Authentication failed", e)
            error_message = (
                "Incorrect OpenAI key. Please make sure your OpenAI API key is correct, or create a new OpenAI API key on your OpenAI dashboard."
                + (
                    " Alternatively, you can purchase code generation credits directly on this website."
                    if IS_PROD
                    else ""
                )
            )
            return await throw_error(error_message)
        except openai.NotFoundError as e:
            print("[GENERATE_CODE] Model not found", e)
            error_message = (
                e.message
                + ". Please make sure you have followed the instructions correctly to obtain an OpenAI key with GPT vision access: https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md"
                + (
                    " Alternatively, you can purchase code generation credits directly on this website."
                    if IS_PROD
                    else ""
                )
            )
            return await throw_error(error_message)
        except openai.RateLimitError as e:
            print("[GENERATE_CODE] Rate limit exceeded", e)
            error_message = (
                "OpenAI error - 'You exceeded your current quota, please check your plan and billing details.'"
                + (
                    " Alternatively, you can purchase code generation credits directly on this website."
                    if IS_PROD
                    else ""
                )
            )
            return await throw_error(error_message)

    if validated_input_mode == "video":
        completion = extract_tag_content("html", completion)

    print("Exact used model for generation: ", exact_llm_version)

    # Write the messages dict into a log so that we can debug later
    write_logs(prompt_messages, completion)  # type: ignore

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
        # Send set code even if image generation fails since that triggers
        # the frontend to update history
        await websocket.send_json({"type": "setCode", "value": completion})
        await websocket.send_json(
            {"type": "status", "value": "Image generation failed but code is complete."}
        )

    await websocket.close()
