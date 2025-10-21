import asyncio
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import traceback
from typing import Callable, Awaitable
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
from llm import (
    Completion,
    Llm,
    OPENAI_MODELS,
    ANTHROPIC_MODELS,
    GEMINI_MODELS,
)
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
from openai.types.chat import ChatCompletionMessageParam

from utils import print_prompt_summary

# WebSocket message types
MessageType = Literal[
    "chunk",
    "status",
    "setCode",
    "error",
    "variantComplete",
    "variantError",
    "variantCount",
]
from image_generation.core import generate_images
from prompts import create_prompt
from prompts.claude_prompts import VIDEO_PROMPT
from prompts.types import Stack, PromptContent

# from utils import pprint_prompt
from ws.constants import APP_ERROR_WEB_SOCKET_CODE  # type: ignore


router = APIRouter()


class VariantErrorAlreadySent(Exception):
    """Exception that indicates a variantError message has already been sent to frontend"""

    def __init__(self, original_error: Exception):
        self.original_error = original_error
        super().__init__(str(original_error))


@dataclass
class PipelineContext:
    """Context object that carries state through the pipeline"""

    websocket: WebSocket
    ws_comm: "WebSocketCommunicator | None" = None
    params: Dict[str, str] = field(default_factory=dict)
    extracted_params: "ExtractedParams | None" = None
    prompt_messages: List[ChatCompletionMessageParam] = field(default_factory=list)
    image_cache: Dict[str, str] = field(default_factory=dict)
    variant_models: List[Llm] = field(default_factory=list)
    completions: List[str] = field(default_factory=list)
    variant_completions: Dict[int, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def send_message(self):
        assert self.ws_comm is not None
        return self.ws_comm.send_message

    @property
    def throw_error(self):
        assert self.ws_comm is not None
        return self.ws_comm.throw_error


class Middleware(ABC):
    """Base class for all pipeline middleware"""

    @abstractmethod
    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        """Process the context and call the next middleware"""
        pass


class Pipeline:
    """Pipeline for processing WebSocket code generation requests"""

    def __init__(self):
        self.middlewares: List[Middleware] = []

    def use(self, middleware: Middleware) -> "Pipeline":
        """Add a middleware to the pipeline"""
        self.middlewares.append(middleware)
        return self

    async def execute(self, websocket: WebSocket) -> None:
        """Execute the pipeline with the given WebSocket"""
        context = PipelineContext(websocket=websocket)

        # Build the middleware chain
        async def start(ctx: PipelineContext):
            pass  # End of pipeline

        chain = start
        for middleware in reversed(self.middlewares):
            chain = self._wrap_middleware(middleware, chain)

        await chain(context)

    def _wrap_middleware(
        self,
        middleware: Middleware,
        next_func: Callable[[PipelineContext], Awaitable[None]],
    ) -> Callable[[PipelineContext], Awaitable[None]]:
        """Wrap a middleware with its next function"""

        async def wrapped(context: PipelineContext) -> None:
            await middleware.process(context, lambda: next_func(context))

        return wrapped


class WebSocketCommunicator:
    """Handles WebSocket communication with consistent error handling"""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.is_closed = False

    async def accept(self) -> None:
        """Accept the WebSocket connection"""
        await self.websocket.accept()
        print("Incoming websocket connection...")

    async def send_message(
        self,
        type: MessageType,
        value: str,
        variantIndex: int,
    ) -> None:
        """Send a message to the client with debug logging"""
        # Print for debugging on the backend
        if type == "error":
            print(f"Error (variant {variantIndex + 1}): {value}")
        elif type == "status":
            print(f"Status (variant {variantIndex + 1}): {value}")
        elif type == "variantComplete":
            print(f"Variant {variantIndex + 1} complete")
        elif type == "variantError":
            print(f"Variant {variantIndex + 1} error: {value}")

        await self.websocket.send_json(
            {"type": type, "value": value, "variantIndex": variantIndex}
        )

    async def throw_error(self, message: str) -> None:
        """Send an error message and close the connection"""
        print(message)
        if not self.is_closed:
            await self.websocket.send_json({"type": "error", "value": message})
            await self.websocket.close(APP_ERROR_WEB_SOCKET_CODE)
            self.is_closed = True

    async def receive_params(self) -> Dict[str, str]:
        """Receive parameters from the client"""
        params: Dict[str, str] = await self.websocket.receive_json()
        print("Received params")
        return params

    async def close(self) -> None:
        """Close the WebSocket connection"""
        if not self.is_closed:
            await self.websocket.close()
            self.is_closed = True


@dataclass
class ExtractedParams:
    stack: Stack
    input_mode: InputMode
    should_generate_images: bool
    openai_api_key: str | None
    anthropic_api_key: str | None
    openai_base_url: str | None
    generation_type: Literal["create", "update"]
    prompt: PromptContent
    history: List[Dict[str, Any]]
    is_imported_from_code: bool


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

        # Extract prompt content
        prompt = params.get("prompt", {"text": "", "images": []})

        # Extract history (default to empty list)
        history = params.get("history", [])

        # Extract imported code flag
        is_imported_from_code = params.get("isImportedFromCode", False)

        return ExtractedParams(
            stack=validated_stack,
            input_mode=validated_input_mode,
            should_generate_images=should_generate_images,
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key,
            openai_base_url=openai_base_url,
            generation_type=generation_type,
            prompt=prompt,
            history=history,
            is_imported_from_code=is_imported_from_code,
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
        input_mode: InputMode,
        openai_api_key: str | None,
        anthropic_api_key: str | None,
        gemini_api_key: str | None = None,
    ) -> List[Llm]:
        """Select appropriate models based on available API keys"""
        try:
            variant_models = self._get_variant_models(
                generation_type,
                input_mode,
                NUM_VARIANTS,
                openai_api_key,
                anthropic_api_key,
                gemini_api_key,
            )

            # Print the variant models (one per line)
            print("Variant models:")
            for index, model in enumerate(variant_models):
                print(f"Variant {index + 1}: {model.value}")

            return variant_models
        except Exception:
            await self.throw_error(
                "No OpenAI or Anthropic API key found. Please add the environment variable "
                "OPENAI_API_KEY or ANTHROPIC_API_KEY to backend/.env or in the settings dialog. "
                "If you add it to .env, make sure to restart the backend server."
            )
            raise Exception("No OpenAI or Anthropic key")

    def _get_variant_models(
        self,
        generation_type: Literal["create", "update"],
        input_mode: InputMode,
        num_variants: int,
        openai_api_key: str | None,
        anthropic_api_key: str | None,
        gemini_api_key: str | None,
    ) -> List[Llm]:
        """Simple model cycling that scales with num_variants"""

        claude_model = Llm.CLAUDE_3_7_SONNET_2025_02_19

        # For text input mode, use Claude 4 Sonnet as third option
        # For other input modes (image/video), use Gemini as third option
        if input_mode == "text":
            third_model = Llm.CLAUDE_4_SONNET_2025_05_14
        else:
            # Gemini only works for create right now
            if generation_type == "create":
                third_model = Llm.GEMINI_2_0_FLASH
            else:
                third_model = claude_model

        # Define models based on available API keys
        if (
            openai_api_key
            and anthropic_api_key
            and (gemini_api_key or input_mode == "text")
        ):
            models = [
                Llm.GPT_4_1_2025_04_14,
                claude_model,
                third_model,
            ]
        elif openai_api_key and anthropic_api_key:
            models = [claude_model, Llm.GPT_4_1_2025_04_14]
        elif anthropic_api_key:
            models = [claude_model, Llm.CLAUDE_4_5_SONNET_2025_09_29]
        elif openai_api_key:
            models = [Llm.GPT_4_1_2025_04_14, Llm.GPT_4O_2024_11_20]
        else:
            raise Exception("No OpenAI or Anthropic key")

        # Cycle through models: [A, B] with num=5 becomes [A, B, A, B, A]
        selected_models: List[Llm] = []
        for i in range(num_variants):
            selected_models.append(models[i % len(models)])

        return selected_models


class PromptCreationStage:
    """Handles prompt assembly for code generation"""

    def __init__(self, throw_error: Callable[[str], Coroutine[Any, Any, None]]):
        self.throw_error = throw_error

    async def create_prompt(
        self,
        extracted_params: ExtractedParams,
    ) -> tuple[List[ChatCompletionMessageParam], Dict[str, str]]:
        """Create prompt messages and return image cache"""
        try:
            prompt_messages, image_cache = await create_prompt(
                stack=extracted_params.stack,
                input_mode=extracted_params.input_mode,
                generation_type=extracted_params.generation_type,
                prompt=extracted_params.prompt,
                history=extracted_params.history,
                is_imported_from_code=extracted_params.is_imported_from_code,
            )

            print_prompt_summary(prompt_messages, truncate=False)

            return prompt_messages, image_cache
        except Exception:
            await self.throw_error(
                "Error assembling prompt. Contact support at support@picoapps.xyz"
            )
            raise


class MockResponseStage:
    """Handles mock AI responses for testing"""

    def __init__(
        self,
        send_message: Callable[[MessageType, str, int], Coroutine[Any, Any, None]],
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


class VideoGenerationStage:
    """Handles video mode code generation using Claude 3 Opus"""

    def __init__(
        self,
        send_message: Callable[[MessageType, str, int], Coroutine[Any, Any, None]],
        throw_error: Callable[[str], Coroutine[Any, Any, None]],
    ):
        self.send_message = send_message
        self.throw_error = throw_error

    async def generate_video_code(
        self,
        prompt_messages: List[ChatCompletionMessageParam],
        anthropic_api_key: str | None,
    ) -> List[str]:
        """Generate code for video input mode"""
        if not anthropic_api_key:
            await self.throw_error(
                "Video only works with Anthropic models. No Anthropic API key found. "
                "Please add the environment variable ANTHROPIC_API_KEY to backend/.env "
                "or in the settings dialog"
            )
            raise Exception("No Anthropic key")

        async def process_chunk(content: str, variantIndex: int):
            await self.send_message("chunk", content, variantIndex)

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
        await self.send_message("setCode", completions[0], 0)
        await self.send_message("variantComplete", "Variant generation complete", 0)

        return completions


class PostProcessingStage:
    """Handles post-processing after code generation completes"""

    def __init__(self):
        pass

    async def process_completions(
        self,
        completions: List[str],
        prompt_messages: List[ChatCompletionMessageParam],
        websocket: WebSocket,
    ) -> None:
        """Process completions and perform cleanup"""
        # Only process non-empty completions
        valid_completions = [comp for comp in completions if comp]

        # Write the first valid completion to logs for debugging
        if valid_completions:
            # Strip the completion of everything except the HTML content
            html_content = extract_html_content(valid_completions[0])
            write_logs(prompt_messages, html_content)

        # Note: WebSocket closing is handled by the caller


class ParallelGenerationStage:
    """Handles parallel variant generation with independent processing for each variant"""

    def __init__(
        self,
        send_message: Callable[[MessageType, str, int], Coroutine[Any, Any, None]],
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
        prompt_messages: List[ChatCompletionMessageParam],
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
        prompt_messages: List[ChatCompletionMessageParam],
        params: Dict[str, str],
    ) -> List[Coroutine[Any, Any, Completion]]:
        """Create generation tasks for each variant model"""
        tasks: List[Coroutine[Any, Any, Completion]] = []

        for index, model in enumerate(variant_models):
            if model in OPENAI_MODELS:
                if self.openai_api_key is None:
                    raise Exception("OpenAI API key is missing.")

                tasks.append(
                    self._stream_openai_with_error_handling(
                        prompt_messages,
                        model_name=model.value,
                        index=index,
                    )
                )
            elif GEMINI_API_KEY and model in GEMINI_MODELS:
                tasks.append(
                    stream_gemini_response(
                        prompt_messages,
                        api_key=GEMINI_API_KEY,
                        callback=lambda x, i=index: self._process_chunk(x, i),
                        model_name=model.value,
                    )
                )
            elif model in ANTHROPIC_MODELS:
                if self.anthropic_api_key is None:
                    raise Exception("Anthropic API key is missing.")

                # For creation, use Claude Sonnet 3.7
                # For updates, we use Claude Sonnet 4.5 until we have tested Claude Sonnet 3.7
                if params["generationType"] == "create":
                    claude_model = Llm.CLAUDE_3_7_SONNET_2025_02_19
                else:
                    claude_model = Llm.CLAUDE_4_5_SONNET_2025_09_29

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

    async def _stream_openai_with_error_handling(
        self,
        prompt_messages: List[ChatCompletionMessageParam],
        model_name: str,
        index: int,
    ) -> Completion:
        """Wrap OpenAI streaming with specific error handling"""
        try:
            assert self.openai_api_key is not None
            return await stream_openai_response(
                prompt_messages,
                api_key=self.openai_api_key,
                base_url=self.openai_base_url,
                callback=lambda x: self._process_chunk(x, index),
                model_name=model_name,
            )
        except openai.AuthenticationError as e:
            print(f"[VARIANT {index + 1}] OpenAI Authentication failed", e)
            error_message = (
                "Incorrect OpenAI key. Please make sure your OpenAI API key is correct, "
                "or create a new OpenAI API key on your OpenAI dashboard."
                + (
                    " Alternatively, you can purchase code generation credits directly on this website."
                    if IS_PROD
                    else ""
                )
            )
            await self.send_message("variantError", error_message, index)
            raise VariantErrorAlreadySent(e)
        except openai.NotFoundError as e:
            print(f"[VARIANT {index + 1}] OpenAI Model not found", e)
            error_message = (
                e.message
                + ". Please make sure you have followed the instructions correctly to obtain "
                "an OpenAI key with GPT vision access: "
                "https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md"
                + (
                    " Alternatively, you can purchase code generation credits directly on this website."
                    if IS_PROD
                    else ""
                )
            )
            await self.send_message("variantError", error_message, index)
            raise VariantErrorAlreadySent(e)
        except openai.RateLimitError as e:
            print(f"[VARIANT {index + 1}] OpenAI Rate limit exceeded", e)
            error_message = (
                "OpenAI error - 'You exceeded your current quota, please check your plan and billing details.'"
                + (
                    " Alternatively, you can purchase code generation credits directly on this website."
                    if IS_PROD
                    else ""
                )
            )
            await self.send_message("variantError", error_message, index)
            raise VariantErrorAlreadySent(e)

    async def _perform_image_generation(
        self,
        completion: str,
        image_cache: dict[str, str],
    ):
        """Generate images for the completion if needed"""
        if not self.should_generate_images:
            return completion

        replicate_api_key = REPLICATE_API_KEY
        if replicate_api_key:
            image_generation_model = "flux"
            api_key = replicate_api_key
        else:
            if not self.openai_api_key:
                print(
                    "No OpenAI API key and Replicate key found. Skipping image generation."
                )
                return completion
            image_generation_model = "dalle3"
            api_key = self.openai_api_key

        print("Generating images with model: ", image_generation_model)

        return await generate_images(
            completion,
            api_key=api_key,
            base_url=self.openai_base_url,
            image_cache=image_cache,
            model=image_generation_model,
        )

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
                processed_html = await self._perform_image_generation(
                    completion["code"],
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
                print(f"Post-processing error for variant {index + 1}: {inner_e}")
                # We still keep the completion in variant_completions

        except Exception as e:
            # Handle any errors that occurred during generation
            print(f"Error in variant {index + 1}: {e}")
            traceback.print_exception(type(e), e, e.__traceback__)

            # Only send error message if it hasn't been sent already
            if not isinstance(e, VariantErrorAlreadySent):
                await self.send_message("variantError", str(e), index)


# Pipeline Middleware Implementations


class WebSocketSetupMiddleware(Middleware):
    """Handles WebSocket setup and teardown"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        # Create and setup WebSocket communicator
        context.ws_comm = WebSocketCommunicator(context.websocket)
        await context.ws_comm.accept()

        try:
            await next_func()
        finally:
            # Always close the WebSocket
            await context.ws_comm.close()


class ParameterExtractionMiddleware(Middleware):
    """Handles parameter extraction and validation"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        # Receive parameters
        assert context.ws_comm is not None
        context.params = await context.ws_comm.receive_params()

        # Extract and validate
        param_extractor = ParameterExtractionStage(context.throw_error)
        context.extracted_params = await param_extractor.extract_and_validate(
            context.params
        )

        # Log what we're generating
        print(
            f"Generating {context.extracted_params.stack} code in {context.extracted_params.input_mode} mode"
        )

        await next_func()


class StatusBroadcastMiddleware(Middleware):
    """Sends initial status messages to all variants"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        # Tell frontend how many variants we're using
        await context.send_message("variantCount", str(NUM_VARIANTS), 0)

        for i in range(NUM_VARIANTS):
            await context.send_message("status", "Generating code...", i)

        await next_func()


class PromptCreationMiddleware(Middleware):
    """Handles prompt creation"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        prompt_creator = PromptCreationStage(context.throw_error)
        assert context.extracted_params is not None
        context.prompt_messages, context.image_cache = (
            await prompt_creator.create_prompt(
                context.extracted_params,
            )
        )

        await next_func()


class CodeGenerationMiddleware(Middleware):
    """Handles the main code generation logic"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        if SHOULD_MOCK_AI_RESPONSE:
            # Use mock response for testing
            mock_stage = MockResponseStage(context.send_message)
            assert context.extracted_params is not None
            context.completions = await mock_stage.generate_mock_response(
                context.extracted_params.input_mode
            )
        else:
            try:
                assert context.extracted_params is not None
                if context.extracted_params.input_mode == "video":
                    # Use video generation for video mode
                    video_stage = VideoGenerationStage(
                        context.send_message, context.throw_error
                    )
                    context.completions = await video_stage.generate_video_code(
                        context.prompt_messages,
                        context.extracted_params.anthropic_api_key,
                    )
                else:
                    # Select models
                    model_selector = ModelSelectionStage(context.throw_error)
                    context.variant_models = await model_selector.select_models(
                        generation_type=context.extracted_params.generation_type,
                        input_mode=context.extracted_params.input_mode,
                        openai_api_key=context.extracted_params.openai_api_key,
                        anthropic_api_key=context.extracted_params.anthropic_api_key,
                        gemini_api_key=GEMINI_API_KEY,
                    )

                    # Generate code for all variants
                    generation_stage = ParallelGenerationStage(
                        send_message=context.send_message,
                        openai_api_key=context.extracted_params.openai_api_key,
                        openai_base_url=context.extracted_params.openai_base_url,
                        anthropic_api_key=context.extracted_params.anthropic_api_key,
                        should_generate_images=context.extracted_params.should_generate_images,
                    )

                    context.variant_completions = (
                        await generation_stage.process_variants(
                            variant_models=context.variant_models,
                            prompt_messages=context.prompt_messages,
                            image_cache=context.image_cache,
                            params=context.params,
                        )
                    )

                    # Check if all variants failed
                    if len(context.variant_completions) == 0:
                        await context.throw_error(
                            "Error generating code. Please contact support."
                        )
                        return  # Don't continue the pipeline

                    # Convert to list format
                    context.completions = []
                    for i in range(len(context.variant_models)):
                        if i in context.variant_completions:
                            context.completions.append(context.variant_completions[i])
                        else:
                            context.completions.append("")

            except Exception as e:
                print(f"[GENERATE_CODE] Unexpected error: {e}")
                await context.throw_error(f"An unexpected error occurred: {str(e)}")
                return  # Don't continue the pipeline

        await next_func()


class PostProcessingMiddleware(Middleware):
    """Handles post-processing and logging"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        post_processor = PostProcessingStage()
        await post_processor.process_completions(
            context.completions, context.prompt_messages, context.websocket
        )

        await next_func()


@router.websocket("/generate-code")
async def stream_code(websocket: WebSocket):
    """Handle WebSocket code generation requests using a pipeline pattern"""
    pipeline = Pipeline()

    # Configure the pipeline
    pipeline.use(WebSocketSetupMiddleware())
    pipeline.use(ParameterExtractionMiddleware())
    pipeline.use(StatusBroadcastMiddleware())
    pipeline.use(PromptCreationMiddleware())
    pipeline.use(CodeGenerationMiddleware())
    pipeline.use(PostProcessingMiddleware())

    # Execute the pipeline
    await pipeline.execute(websocket)
