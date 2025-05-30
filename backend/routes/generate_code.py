import asyncio
from dataclasses import dataclass
import traceback
from fastapi import APIRouter, WebSocket
import openai
from codegen.utils import extract_html_content
from config import (
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    IS_PROD,
    NUM_VARIANTS,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    REPLICATE_API_KEY,
    SHOULD_MOCK_AI_RESPONSE,
)
from custom_types import InputMode
from llm import Completion, Llm
from models import (
    stream_claude_response,
    stream_claude_response_native,
    stream_openai_response,
    stream_gemini_response,
)
from fs_logging.core import write_logs
from mock_llm import mock_completion
from typing import (
    Any,
    Callable,
    Coroutine,
    Dict,
    List,
    Literal,
    cast,
    get_args,
)
from image_generation.core import generate_images
from prompts import create_prompt
from prompts.claude_prompts import VIDEO_PROMPT
from prompts.types import Stack

# from utils import pprint_prompt
from ws.constants import APP_ERROR_WEB_SOCKET_CODE  # type: ignore


router = APIRouter()


@dataclass
class ExtractedParams:
    stack: Stack
    input_mode: InputMode
    should_generate_images: bool
    openai_api_key: str | None
    anthropic_api_key: str | None
    openai_base_url: str | None
    generation_type: Literal["create", "update"]


class ParameterExtractionStage:
    """Handles parameter extraction and validation from WebSocket requests"""

    def __init__(self, throw_error: Callable[[str], Coroutine[Any, Any, None]]):
        self.throw_error = throw_error

    async def extract_and_validate(self, params: Dict[str, str]) -> ExtractedParams:
        """Extract and validate all parameters from the request"""
        # Read the code config settings (stack) from the request.
        generated_code_config = params.get("generatedCodeConfig", "")
        if generated_code_config not in get_args(Stack):
            await self.throw_error(
                f"Invalid generated code config: {generated_code_config}"
            )
            raise ValueError(f"Invalid generated code config: {generated_code_config}")
        validated_stack = cast(Stack, generated_code_config)

        # Validate the input mode
        input_mode = params.get("inputMode")
        if input_mode not in get_args(InputMode):
            await self.throw_error(f"Invalid input mode: {input_mode}")
            raise ValueError(f"Invalid input mode: {input_mode}")
        validated_input_mode = cast(InputMode, input_mode)

        openai_api_key = self._get_from_settings_dialog_or_env(
            params, "openAiApiKey", OPENAI_API_KEY
        )

        # If neither is provided, we throw an error later only if Claude is used.
        anthropic_api_key = self._get_from_settings_dialog_or_env(
            params, "anthropicApiKey", ANTHROPIC_API_KEY
        )

        # Base URL for OpenAI API
        openai_base_url: str | None = None
        # Disable user-specified OpenAI Base URL in prod
        if not IS_PROD:
            openai_base_url = self._get_from_settings_dialog_or_env(
                params, "openAiBaseURL", OPENAI_BASE_URL
            )
        if not openai_base_url:
            print("Using official OpenAI URL")

        # Get the image generation flag from the request. Fall back to True if not provided.
        should_generate_images = bool(params.get("isImageGenerationEnabled", True))

        # Extract and validate generation type
        generation_type = params.get("generationType", "create")
        if generation_type not in ["create", "update"]:
            await self.throw_error(f"Invalid generation type: {generation_type}")
            raise ValueError(f"Invalid generation type: {generation_type}")
        generation_type = cast(Literal["create", "update"], generation_type)

        return ExtractedParams(
            stack=validated_stack,
            input_mode=validated_input_mode,
            should_generate_images=should_generate_images,
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key,
            openai_base_url=openai_base_url,
            generation_type=generation_type,
        )

    def _get_from_settings_dialog_or_env(
        self, params: dict[str, str], key: str, env_var: str | None
    ) -> str | None:
        """Get value from client settings or environment variable"""
        value = params.get(key)
        if value:
            print(f"Using {key} from client-side settings dialog")
            return value

        if env_var:
            print(f"Using {key} from environment variable")
            return env_var

        return None


class ModelSelectionStage:
    """Handles selection of variant models based on available API keys and generation type"""
    
    def __init__(self, throw_error: Callable[[str], Coroutine[Any, Any, None]]):
        self.throw_error = throw_error
    
    async def select_models(
        self,
        generation_type: Literal["create", "update"],
        openai_api_key: str | None,
        anthropic_api_key: str | None,
        gemini_api_key: str | None = None,
    ) -> List[Llm]:
        """Select appropriate models based on available API keys"""
        variant_models = []
        
        # Determine Claude model based on generation type
        # For creation, use Claude Sonnet 3.7
        # For updates, use Claude Sonnet 3.5 until we have tested Claude Sonnet 3.7
        if generation_type == "create":
            claude_model = Llm.CLAUDE_3_7_SONNET_2025_02_19
        else:
            claude_model = Llm.CLAUDE_3_5_SONNET_2024_06_20
        
        # Select models based on available API keys
        if openai_api_key and anthropic_api_key:
            variant_models = [
                claude_model,
                Llm.GEMINI_2_5_FLASH_PREVIEW_05_20,
            ]
        elif openai_api_key:
            variant_models = [
                Llm.GPT_4O_2024_11_20,
                Llm.GPT_4O_2024_11_20,
            ]
        elif anthropic_api_key:
            variant_models = [
                claude_model,
                Llm.CLAUDE_3_5_SONNET_2024_06_20,
            ]
        else:
            await self.throw_error(
                "No OpenAI or Anthropic API key found. Please add the environment variable "
                "OPENAI_API_KEY or ANTHROPIC_API_KEY to backend/.env or in the settings dialog. "
                "If you add it to .env, make sure to restart the backend server."
            )
            raise Exception("No OpenAI or Anthropic key")
        
        # Print the variant models (one per line)
        print("Variant models:")
        for index, model in enumerate(variant_models):
            print(f"Variant {index}: {model.value}")
        
        return variant_models


class PromptCreationStage:
    """Handles prompt assembly for code generation"""
    
    def __init__(self, throw_error: Callable[[str], Coroutine[Any, Any, None]]):
        self.throw_error = throw_error
    
    async def create_prompt(
        self,
        params: Dict[str, str],
        stack: Stack,
        input_mode: InputMode,
    ) -> tuple[List[Dict[str, Any]], Dict[str, str]]:
        """Create prompt messages and return image cache"""
        try:
            prompt_messages, image_cache = await create_prompt(params, stack, input_mode)
            return prompt_messages, image_cache
        except Exception as e:
            await self.throw_error(
                "Error assembling prompt. Contact support at support@picoapps.xyz"
            )
            raise


class MockResponseStage:
    """Handles mock AI responses for testing"""
    
    def __init__(
        self,
        send_message: Callable[[str, str, int], Coroutine[Any, Any, None]],
    ):
        self.send_message = send_message
    
    async def generate_mock_response(
        self,
        input_mode: InputMode,
    ) -> List[str]:
        """Generate mock response for testing"""
        async def process_chunk(content: str, variantIndex: int):
            await self.send_message("chunk", content, variantIndex)
        
        completion_results = [
            await mock_completion(process_chunk, input_mode=input_mode)
        ]
        completions = [result["code"] for result in completion_results]
        
        # Send the complete variant back to the client
        await self.send_message("setCode", completions[0], 0)
        await self.send_message("variantComplete", "Variant generation complete", 0)
        
        return completions


class ParallelGenerationStage:
    """Handles parallel variant generation with independent processing for each variant"""

    def __init__(
        self,
        send_message: Callable[[str, str, int], Coroutine[Any, Any, None]],
        openai_api_key: str | None,
        openai_base_url: str | None,
        anthropic_api_key: str | None,
        should_generate_images: bool,
    ):
        self.send_message = send_message
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.anthropic_api_key = anthropic_api_key
        self.should_generate_images = should_generate_images

    async def process_variants(
        self,
        variant_models: List[Llm],
        prompt_messages: List[Dict[str, Any]],
        image_cache: Dict[str, str],
        params: Dict[str, str],
    ) -> Dict[int, str]:
        """Process all variants in parallel and return completions"""
        tasks = self._create_generation_tasks(variant_models, prompt_messages, params)

        # Dictionary to track variant tasks and their status
        variant_tasks: Dict[int, asyncio.Task[Completion]] = {}
        variant_completions: Dict[int, str] = {}

        # Create tasks for each variant
        for index, task in enumerate(tasks):
            variant_task = asyncio.create_task(task)
            variant_tasks[index] = variant_task

        # Process each variant independently
        variant_processors = [
            self._process_variant_completion(
                index, task, variant_models[index], image_cache, variant_completions
            )
            for index, task in variant_tasks.items()
        ]

        # Wait for all variants to complete
        await asyncio.gather(*variant_processors, return_exceptions=True)

        return variant_completions

    def _create_generation_tasks(
        self,
        variant_models: List[Llm],
        prompt_messages: List[Dict[str, Any]],
        params: Dict[str, str],
    ) -> List[Coroutine[Any, Any, Completion]]:
        """Create generation tasks for each variant model"""
        tasks: List[Coroutine[Any, Any, Completion]] = []

        for index, model in enumerate(variant_models):
            if (
                model == Llm.GPT_4O_2024_11_20
                or model == Llm.O1_2024_12_17
                or model == Llm.O4_MINI_2025_04_16
                or model == Llm.O3_2025_04_16
                or model == Llm.GPT_4_1_2025_04_14
                or model == Llm.GPT_4_1_MINI_2025_04_14
                or model == Llm.GPT_4_1_NANO_2025_04_14
            ):
                if self.openai_api_key is None:
                    raise Exception("OpenAI API key is missing.")

                tasks.append(
                    stream_openai_response(
                        prompt_messages,
                        api_key=self.openai_api_key,
                        base_url=self.openai_base_url,
                        callback=lambda x, i=index: self._process_chunk(x, i),
                        model_name=model.value,
                    )
                )
            elif GEMINI_API_KEY and (
                model == Llm.GEMINI_2_0_PRO_EXP
                or model == Llm.GEMINI_2_0_FLASH_EXP
                or model == Llm.GEMINI_2_0_FLASH
                or model == Llm.GEMINI_2_5_FLASH_PREVIEW_05_20
                or model == Llm.GEMINI_2_5_PRO_PREVIEW_05_06
            ):
                tasks.append(
                    stream_gemini_response(
                        prompt_messages,
                        api_key=GEMINI_API_KEY,
                        callback=lambda x, i=index: self._process_chunk(x, i),
                        model_name=model.value,
                    )
                )
            elif (
                model == Llm.CLAUDE_3_5_SONNET_2024_06_20
                or model == Llm.CLAUDE_3_5_SONNET_2024_10_22
                or model == Llm.CLAUDE_3_7_SONNET_2025_02_19
            ):
                if self.anthropic_api_key is None:
                    raise Exception("Anthropic API key is missing.")

                # For creation, use Claude Sonnet 3.7
                # For updates, we use Claude Sonnet 3.5 until we have tested Claude Sonnet 3.7
                if params["generationType"] == "create":
                    claude_model = Llm.CLAUDE_3_7_SONNET_2025_02_19
                else:
                    claude_model = Llm.CLAUDE_3_5_SONNET_2024_06_20

                tasks.append(
                    stream_claude_response(
                        prompt_messages,
                        api_key=self.anthropic_api_key,
                        callback=lambda x, i=index: self._process_chunk(x, i),
                        model_name=claude_model.value,
                    )
                )

        return tasks

    async def _process_chunk(self, content: str, variant_index: int):
        """Process streaming chunks"""
        await self.send_message("chunk", content, variant_index)

    async def _process_variant_completion(
        self,
        index: int,
        task: asyncio.Task[Completion],
        model: Llm,
        image_cache: Dict[str, str],
        variant_completions: Dict[int, str],
    ):
        """Process a single variant completion including image generation"""
        try:
            completion = await task

            print(f"{model.value} completion took {completion['duration']:.2f} seconds")
            variant_completions[index] = completion["code"]

            try:
                # Process images for this variant
                processed_html = await perform_image_generation(
                    completion["code"],
                    self.should_generate_images,
                    self.openai_api_key,
                    self.openai_base_url,
                    image_cache,
                )

                # Extract HTML content
                processed_html = extract_html_content(processed_html)

                # Send the complete variant back to the client
                await self.send_message("setCode", processed_html, index)
                await self.send_message(
                    "variantComplete",
                    "Variant generation complete",
                    index,
                )
            except Exception as inner_e:
                # If websocket is closed or other error during post-processing
                print(f"Post-processing error for variant {index}: {inner_e}")
                # We still keep the completion in variant_completions

        except Exception as e:
            # Handle any errors that occurred during generation
            print(f"Error in variant {index}: {e}")
            traceback.print_exception(type(e), e, e.__traceback__)


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
        type: Literal[
            "chunk", "status", "setCode", "error", "variantComplete", "variantError"
        ],
        value: str,
        variantIndex: int,
    ):
        # Print for debugging on the backend
        if type == "error":
            print(f"Error (variant {variantIndex}): {value}")
        elif type == "status":
            print(f"Status (variant {variantIndex}): {value}")
        elif type == "variantComplete":
            print(f"Variant {variantIndex} complete")
        elif type == "variantError":
            print(f"Variant {variantIndex} error: {value}")

        await websocket.send_json(
            {"type": type, "value": value, "variantIndex": variantIndex}
        )

    ## Parameter extract and validation

    # TODO: Are the values always strings?
    params: dict[str, str] = await websocket.receive_json()
    print("Received params")

    # Use ParameterExtractionStage to extract and validate parameters
    param_extractor = ParameterExtractionStage(throw_error)
    extracted_params = await param_extractor.extract_and_validate(params)

    # Unpack for easier access
    stack = extracted_params.stack
    input_mode = extracted_params.input_mode
    openai_api_key = extracted_params.openai_api_key
    openai_base_url = extracted_params.openai_base_url
    anthropic_api_key = extracted_params.anthropic_api_key
    should_generate_images = extracted_params.should_generate_images
    generation_type = extracted_params.generation_type

    print(f"Generating {stack} code in {input_mode} mode")

    for i in range(NUM_VARIANTS):
        await send_message("status", "Generating code...", i)

    ### Prompt creation
    
    # Use PromptCreationStage to create prompt
    prompt_creator = PromptCreationStage(throw_error)
    prompt_messages, image_cache = await prompt_creator.create_prompt(
        params, stack, input_mode
    )
    
    # pprint_prompt(prompt_messages)  # type: ignore

    ### Code generation

    async def process_chunk(content: str, variantIndex: int):
        await send_message("chunk", content, variantIndex)

    if SHOULD_MOCK_AI_RESPONSE:
        # Use MockResponseStage for testing
        mock_stage = MockResponseStage(send_message)
        completions = await mock_stage.generate_mock_response(input_mode)
    else:
        try:
            if input_mode == "video":
                if not anthropic_api_key:
                    await throw_error(
                        "Video only works with Anthropic models. No Anthropic API key found. Please add the environment variable ANTHROPIC_API_KEY to backend/.env or in the settings dialog"
                    )
                    raise Exception("No Anthropic key")

                completion_results = [
                    await stream_claude_response_native(
                        system_prompt=VIDEO_PROMPT,
                        messages=prompt_messages,  # type: ignore
                        api_key=anthropic_api_key,
                        callback=lambda x: process_chunk(x, 0),
                        model_name=Llm.CLAUDE_3_OPUS.value,
                        include_thinking=True,
                    )
                ]
                completions = [result["code"] for result in completion_results]

                # Send the complete variant back to the client
                await send_message("setCode", completions[0], 0)
                await send_message("variantComplete", "Variant generation complete", 0)
            else:
                # Use ModelSelectionStage to select variant models
                model_selector = ModelSelectionStage(throw_error)
                variant_models = await model_selector.select_models(
                    generation_type=generation_type,
                    openai_api_key=openai_api_key,
                    anthropic_api_key=anthropic_api_key,
                    gemini_api_key=GEMINI_API_KEY,
                )

                # Create and use the ParallelGenerationStage
                generation_stage = ParallelGenerationStage(
                    send_message=send_message,
                    openai_api_key=openai_api_key,
                    openai_base_url=openai_base_url,
                    anthropic_api_key=anthropic_api_key,
                    should_generate_images=should_generate_images,
                )

                # Process all variants
                variant_completions = await generation_stage.process_variants(
                    variant_models=variant_models,
                    prompt_messages=prompt_messages,
                    image_cache=image_cache,
                    params=params,
                )

                # Check if all variants failed
                if len(variant_completions) == 0:
                    await throw_error("Error generating code. Please contact support.")
                    raise Exception("All generations failed")

                # Prepare completions list for further processing
                completions: list[str] = []
                for i in range(len(variant_models)):
                    if i in variant_completions:
                        completions.append(variant_completions[i])
                    else:
                        # Add empty string for cancelled/failed variants
                        completions.append("")

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

    # Only process non-empty completions
    valid_completions = [comp for comp in completions if comp]

    # Write the first valid completion to logs for debugging
    if valid_completions:
        # Strip the completion of everything except the HTML content
        html_content = extract_html_content(valid_completions[0])
        write_logs(prompt_messages, html_content)

    # Close the websocket connection
    await websocket.close()
