import asyncio
from dataclasses import dataclass
import traceback
from fastapi import APIRouter, WebSocket
import openai
from screenshot_to_code.config import (
    ANTHROPIC_API_KEY,
    IS_PROD,
    NUM_VARIANTS,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    REPLICATE_API_KEY,
    SHOULD_MOCK_AI_RESPONSE,
)
from screenshot_to_code.custom_types import InputMode
from screenshot_to_code.llm import (
    Llm,
    convert_frontend_str_to_llm,
    stream_claude_response,
    stream_claude_response_native,
    stream_openai_response,
)
from screenshot_to_code.fs_logging.core import write_logs
from screenshot_to_code.mock_llm import mock_completion
from typing import Any, Callable, Coroutine, Dict, List, Literal, cast, get_args

from screenshot_to_code.image_generation.core import generate_images
from screenshot_to_code.prompts import create_prompt
from screenshot_to_code.prompts.claude_prompts import VIDEO_PROMPT
from screenshot_to_code.prompts.types import Stack
from screenshot_to_code.codegen.utils import extract_html_content

# from screenshot_to_code.utils import pprint_prompt
from screenshot_to_code.ws.constants import APP_ERROR_WEB_SOCKET_CODE  # type: ignore


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


# Generate images, if needed
async def perform_image_generation(
    completion: str,
    should_generate_images: bool,
    openai_api_key: str | None,
    openai_base_url: str | None,
    image_cache: dict[str, str],
):
    replicate_api_key = REPLICATE_API_KEY
    if not should_generate_images:
        return completion

    if replicate_api_key:
        image_generation_model = "flux"
        api_key = replicate_api_key
    else:
        if not openai_api_key:
            print(
                "No OpenAI API key and Replicate key found. Skipping image generation."
            )
            return completion
        image_generation_model = "dalle3"
        api_key = openai_api_key

    print("Generating images with model: ", image_generation_model)

    return await generate_images(
        completion,
        api_key=api_key,
        base_url=openai_base_url,
        image_cache=image_cache,
        model=image_generation_model,
    )


@dataclass
class ExtractedParams:
    stack: Stack
    input_mode: InputMode
    code_generation_model: Llm
    should_generate_images: bool
    openai_api_key: str | None
    anthropic_api_key: str | None
    openai_base_url: str | None


async def extract_params(
    params: Dict[str, str], throw_error: Callable[[str], Coroutine[Any, Any, None]]
) -> ExtractedParams:
    # Read the code config settings (stack) from the request.
    generated_code_config = params.get("generatedCodeConfig", "")
    if generated_code_config not in get_args(Stack):
        await throw_error(f"Invalid generated code config: {generated_code_config}")
        raise ValueError(f"Invalid generated code config: {generated_code_config}")
    validated_stack = cast(Stack, generated_code_config)

    # Validate the input mode
    input_mode = params.get("inputMode")
    if input_mode not in get_args(InputMode):
        await throw_error(f"Invalid input mode: {input_mode}")
        raise ValueError(f"Invalid input mode: {input_mode}")
    validated_input_mode = cast(InputMode, input_mode)

    # Read the model from the request. Fall back to default if not provided.
    code_generation_model_str = params.get(
        "codeGenerationModel", Llm.GPT_4O_2024_05_13.value
    )
    try:
        code_generation_model = convert_frontend_str_to_llm(code_generation_model_str)
    except ValueError:
        await throw_error(f"Invalid model: {code_generation_model_str}")
        raise ValueError(f"Invalid model: {code_generation_model_str}")

    openai_api_key = get_from_settings_dialog_or_env(
        params, "openAiApiKey", OPENAI_API_KEY
    )

    # If neither is provided, we throw an error later only if Claude is used.
    anthropic_api_key = get_from_settings_dialog_or_env(
        params, "anthropicApiKey", ANTHROPIC_API_KEY
    )

    # Base URL for OpenAI API
    openai_base_url: str | None = None
    # Disable user-specified OpenAI Base URL in prod
    if not IS_PROD:
        openai_base_url = get_from_settings_dialog_or_env(
            params, "openAiBaseURL", OPENAI_BASE_URL
        )
    if not openai_base_url:
        print("Using official OpenAI URL")

    # Get the image generation flag from the request. Fall back to True if not provided.
    should_generate_images = bool(params.get("isImageGenerationEnabled", True))

    return ExtractedParams(
        stack=validated_stack,
        input_mode=validated_input_mode,
        code_generation_model=code_generation_model,
        should_generate_images=should_generate_images,
        openai_api_key=openai_api_key,
        anthropic_api_key=anthropic_api_key,
        openai_base_url=openai_base_url,
    )


def get_from_settings_dialog_or_env(
    params: dict[str, str], key: str, env_var: str | None
) -> str | None:
    value = params.get(key)
    if value:
        print(f"Using {key} from client-side settings dialog")
        return value

    if env_var:
        print(f"Using {key} from environment variable")
        return env_var

    return None


@router.websocket("/generate-code")
async def stream_code(websocket: WebSocket):
    await websocket.accept()
    print("Incoming websocket connection...")

    ## Communication protocol setup
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
        # Print for debugging on the backend
        if type == "error":
            print(f"Error (variant {variantIndex}): {value}")
        elif type == "status":
            print(f"Status (variant {variantIndex}): {value}")

        await websocket.send_json(
            {"type": type, "value": value, "variantIndex": variantIndex}
        )

    ## Parameter extract and validation

    # TODO: Are the values always strings?
    params: dict[str, str] = await websocket.receive_json()
    print("Received params")

    extracted_params = await extract_params(params, throw_error)
    stack = extracted_params.stack
    input_mode = extracted_params.input_mode
    code_generation_model = extracted_params.code_generation_model
    openai_api_key = extracted_params.openai_api_key
    openai_base_url = extracted_params.openai_base_url
    anthropic_api_key = extracted_params.anthropic_api_key
    should_generate_images = extracted_params.should_generate_images

    # Auto-upgrade usage of older models
    code_generation_model = auto_upgrade_model(code_generation_model)

    print(
        f"Generating {stack} code in {input_mode} mode using {code_generation_model}..."
    )

    for i in range(NUM_VARIANTS):
        await send_message("status", "Generating code...", i)

    ### Prompt creation

    # Image cache for updates so that we don't have to regenerate images
    image_cache: Dict[str, str] = {}

    try:
        prompt_messages, image_cache = await create_prompt(params, stack, input_mode)
    except:
        await throw_error(
            "Error assembling prompt. Contact support at support@picoapps.xyz"
        )
        raise

    # pprint_prompt(prompt_messages)  # type: ignore

    ### Code generation

    async def process_chunk(content: str, variantIndex: int):
        await send_message("chunk", content, variantIndex)

    if SHOULD_MOCK_AI_RESPONSE:
        completions = [await mock_completion(process_chunk, input_mode=input_mode)]
    else:
        try:
            if input_mode == "video":
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
                    variant_models = ["anthropic", "openai"]
                elif openai_api_key:
                    variant_models = ["openai", "openai"]
                elif anthropic_api_key:
                    variant_models = ["anthropic", "anthropic"]
                else:
                    await throw_error(
                        "No OpenAI or Anthropic API key found. Please add the environment variable OPENAI_API_KEY or ANTHROPIC_API_KEY to backend/.env or in the settings dialog. If you add it to .env, make sure to restart the backend server."
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

                # Run the models in parallel and capture exceptions if any
                completions = await asyncio.gather(*tasks, return_exceptions=True)

                # If all generations failed, throw an error
                all_generations_failed = all(
                    isinstance(completion, Exception) for completion in completions
                )
                if all_generations_failed:
                    await throw_error("Error generating code. Please contact support.")

                    # Print the all the underlying exceptions for debugging
                    for completion in completions:
                        traceback.print_exception(
                            type(completion), completion, completion.__traceback__
                        )
                    raise Exception("All generations failed")

                # If some completions failed, replace them with empty strings
                for index, completion in enumerate(completions):
                    if isinstance(completion, Exception):
                        completions[index] = ""
                        print("Generation failed for variant", index)

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

    ## Post-processing

    # Strip the completion of everything except the HTML content
    completions = [extract_html_content(completion) for completion in completions]

    # Write the messages dict into a log so that we can debug later
    write_logs(prompt_messages, completions[0])

    ## Image Generation

    for index, _ in enumerate(completions):
        await send_message("status", "Generating images...", index)

    image_generation_tasks = [
        perform_image_generation(
            completion,
            should_generate_images,
            openai_api_key,
            openai_base_url,
            image_cache,
        )
        for completion in completions
    ]

    updated_completions = await asyncio.gather(*image_generation_tasks)

    for index, updated_html in enumerate(updated_completions):
        await send_message("setCode", updated_html, index)
        await send_message("status", "Code generation complete.", index)

    await websocket.close()
