import os
import asyncio
import traceback
from fastapi import APIRouter, WebSocket
import openai
from codegen.utils import extract_html_content
from config import ANTHROPIC_API_KEY, IS_PROD, OPENAI_API_KEY, SHOULD_MOCK_AI_RESPONSE
from custom_types import InputMode
from llm import (
    Llm,
    convert_frontend_str_to_llm,
    is_openai_model,
    stream_claude_response,
    stream_claude_response_native,
    stream_openai_response,
)
from openai.types.chat import ChatCompletionMessageParam
from fs_logging.core import write_logs
from mock_llm import mock_completion
from typing import Any, Callable, Coroutine, Dict, List, Literal, Union, cast, get_args
from image_generation import create_alt_url_mapping, generate_images
from prompts import assemble_imported_code_prompt, assemble_prompt
from prompts.claude_prompts import VIDEO_PROMPT
from prompts.types import Stack

# from utils import pprint_prompt
from video.utils import assemble_claude_prompt_video
from ws.constants import APP_ERROR_WEB_SOCKET_CODE  # type: ignore


router = APIRouter()


# Auto-upgrade usage of older models
def auto_upgrade_model(code_generation_model: Llm) -> Llm:
    if code_generation_model in {Llm.GPT_4_VISION, Llm.GPT_4_TURBO_2024_04_09}:
        print(
            f"Initial deprecated model: {code_generation_model}. Auto-updating code generation model to GPT-4O-2024-05-13"
        )
        return Llm.GPT_4O_2024_05_13
    elif code_generation_model == Llm.CLAUDE_3_SONNET:
        print(
            f"Initial deprecated model: {code_generation_model}. Auto-updating code generation model to CLAUDE-3.5-SONNET-2024-06-20"
        )
        return Llm.CLAUDE_3_5_SONNET_2024_06_20
    return code_generation_model


# Generate images and return updated completions
async def process_completion(
    completion: str,
    index: int,
    should_generate_images: bool,
    openai_api_key: str | None,
    openai_base_url: str | None,
    image_cache: dict[str, str],
    send_message: Callable[
        [Literal["chunk", "status", "setCode", "error"], str, int],
        Coroutine[Any, Any, None],
    ],
):
    try:
        if should_generate_images and openai_api_key:
            await send_message("status", "Generating images...", index)
            updated_html = await generate_images(
                completion,
                api_key=openai_api_key,
                base_url=openai_base_url,
                image_cache=image_cache,
            )
        else:
            updated_html = completion

        await send_message("setCode", updated_html, index)
        await send_message("status", "Code generation complete.", index)
    except Exception as e:
        traceback.print_exc()
        print(f"Image generation failed for variant {index}", e)
        await send_message("setCode", completion, index)
        await send_message(
            "status", "Image generation failed but code is complete.", index
        )


@router.websocket("/generate-code")
async def stream_code(websocket: WebSocket):
    await websocket.accept()

    print("Incoming websocket connection...")

    async def throw_error(
        message: str,
    ):
        print(message)
        await websocket.send_json({"type": "error", "value": message})
        await websocket.close(APP_ERROR_WEB_SOCKET_CODE)

    async def send_message(
        type: Literal["chunk", "status", "setCode", "error"],
        value: str,
        variantIndex: int,
    ):
        await websocket.send_json(
            {"type": type, "value": value, "variantIndex": variantIndex}
        )

    # TODO: Are the values always strings?
    params: Dict[str, str] = await websocket.receive_json()
    print("Received params")

    # Read the code config settings (stack) from the request.
    generated_code_config = params.get("generatedCodeConfig", "")
    if not generated_code_config in get_args(Stack):
        await throw_error(f"Invalid generated code config: {generated_code_config}")
        raise Exception(f"Invalid generated code config: {generated_code_config}")
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
    code_generation_model_str = params.get(
        "codeGenerationModel", Llm.GPT_4O_2024_05_13.value
    )
    try:
        code_generation_model = convert_frontend_str_to_llm(code_generation_model_str)
    except:
        await throw_error(f"Invalid model: {code_generation_model_str}")
        raise Exception(f"Invalid model: {code_generation_model_str}")

    # Auto-upgrade usage of older models
    code_generation_model = auto_upgrade_model(code_generation_model)
    print(
        f"Generating {generated_code_config} code for uploaded {input_mode} using {code_generation_model} model..."
    )

    # Get the OpenAI API key from the request. Fall back to environment variable if not provided.
    # If neither is provided, we throw an error.
    openai_api_key = params.get("openAiApiKey")
    if openai_api_key:
        print("Using OpenAI API key from client-side settings dialog")
    else:
        openai_api_key = OPENAI_API_KEY
        if openai_api_key:
            print("Using OpenAI API key from environment variable")

    if not openai_api_key and is_openai_model(code_generation_model):
        await throw_error(
            "No OpenAI API key found. Please add your API key in the settings dialog or add it to backend/.env file. If you add it to .env, make sure to restart the backend server."
        )
        return

    # Get the Anthropic API key from the request. Fall back to environment variable if not provided.
    # If neither is provided, we throw an error later only if Claude is used.
    anthropic_api_key = params.get("anthropicApiKey")
    if anthropic_api_key:
        print("Using Anthropic API key from client-side settings dialog")
    else:
        anthropic_api_key = ANTHROPIC_API_KEY
        if anthropic_api_key:
            print("Using Anthropic API key from environment variable")

    # Get the OpenAI Base URL from the request. Fall back to environment variable if not provided.
    openai_base_url: Union[str, None] = None
    # Disable user-specified OpenAI Base URL in prod
    if not os.environ.get("IS_PROD"):
        openai_base_url = params.get("openAiBaseURL")
        if openai_base_url:
            print("Using OpenAI Base URL from client-side settings dialog")
        else:
            openai_base_url = os.environ.get("OPENAI_BASE_URL")
            if openai_base_url:
                print("Using OpenAI Base URL from environment variable")

    if not openai_base_url:
        print("Using official OpenAI URL")

    # Get the image generation flag from the request. Fall back to True if not provided.
    should_generate_images = bool(params.get("isImageGenerationEnabled", True))

    print("generating code...")
    await send_message("status", "Generating code...", 0)
    await send_message("status", "Generating code...", 1)

    async def process_chunk(content: str, variantIndex: int):
        await send_message("chunk", content, variantIndex)

    # Image cache for updates so that we don't have to regenerate images
    image_cache: Dict[str, str] = {}

    # If this generation started off with imported code, we need to assemble the prompt differently
    if params.get("isImportedFromCode") and params["isImportedFromCode"]:
        original_imported_code = params["history"][0]
        prompt_messages = assemble_imported_code_prompt(
            original_imported_code, valid_stack, code_generation_model
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
            # TODO: This should use variantIndex
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
        completions = [
            await mock_completion(process_chunk, input_mode=validated_input_mode)
        ]
    else:
        try:
            if validated_input_mode == "video":
                if not anthropic_api_key:
                    await throw_error(
                        "Video only works with Anthropic models. No Anthropic API key found. Please add the environment variable ANTHROPIC_API_KEY to backend/.env or in the settings dialog"
                    )
                    raise Exception("No Anthropic key")

                completions = [
                    await stream_claude_response_native(
                        system_prompt=VIDEO_PROMPT,
                        messages=prompt_messages,  # type: ignore
                        api_key=anthropic_api_key,
                        callback=lambda x: process_chunk(x, 0),
                        model=Llm.CLAUDE_3_OPUS,
                        include_thinking=True,
                    )
                ]
            else:

                # Depending on the presence and absence of various keys,
                # we decide which models to run
                variant_models = []
                if openai_api_key and anthropic_api_key:
                    variant_models = ["openai", "anthropic"]
                elif openai_api_key:
                    variant_models = ["openai", "openai"]
                elif anthropic_api_key:
                    variant_models = ["anthropic", "anthropic"]
                else:
                    await throw_error(
                        "No OpenAI or Anthropic API key found. Please add the environment variable OPENAI_API_KEY or ANTHROPIC_API_KEY to backend/.env or in the settings dialog"
                    )
                    raise Exception("No OpenAI or Anthropic key")

                tasks: List[Coroutine[Any, Any, str]] = []
                for index, model in enumerate(variant_models):
                    if model == "openai":
                        if openai_api_key is None:
                            await throw_error("OpenAI API key is missing.")
                            raise Exception("OpenAI API key is missing.")

                        tasks.append(
                            stream_openai_response(
                                prompt_messages,
                                api_key=openai_api_key,
                                base_url=openai_base_url,
                                callback=lambda x, i=index: process_chunk(x, i),
                                model=Llm.GPT_4O_2024_05_13,
                            )
                        )
                    elif model == "anthropic":
                        if anthropic_api_key is None:
                            await throw_error("Anthropic API key is missing.")
                            raise Exception("Anthropic API key is missing.")

                        tasks.append(
                            stream_claude_response(
                                prompt_messages,
                                api_key=anthropic_api_key,
                                callback=lambda x, i=index: process_chunk(x, i),
                                model=Llm.CLAUDE_3_5_SONNET_2024_06_20,
                            )
                        )

                completions = await asyncio.gather(*tasks)
                print("Models used for generation: ", variant_models)

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

    # if validated_input_mode == "video":
    #     completion = extract_tag_content("html", completions[0])

    # Strip the completion of everything except the HTML content
    completions = [extract_html_content(completion) for completion in completions]

    # Write the messages dict into a log so that we can debug later
    write_logs(prompt_messages, completions[0])

    try:
        image_generation_tasks = [
            process_completion(
                completion,
                index,
                should_generate_images,
                openai_api_key,
                openai_base_url,
                image_cache,
                send_message,
            )
            for index, completion in enumerate(completions)
        ]
        await asyncio.gather(*image_generation_tasks)
    except Exception as e:
        traceback.print_exc()
        print("An error occurred during image generation and processing", e)
        await send_message(
            "status", "An error occurred during image generation and processing.", 0
        )

    await websocket.close()
