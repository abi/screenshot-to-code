import asyncio
import time
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import traceback
from nanoid import generate
from typing import Callable, Awaitable
from fastapi import APIRouter, WebSocket
import openai
import sentry_sdk
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from codegen.utils import extract_html_content
from config import (
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    IS_DEBUG_ENABLED,
    IS_PROD,
    NUM_VARIANTS,
    NUM_VARIANTS_VIDEO,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    PLATFORM_ANTHROPIC_API_KEY,
    PLATFORM_GEMINI_API_KEY,
    PLATFORM_OPENAI_API_KEY,
    REPLICATE_API_KEY,
)
from custom_types import InputMode
from llm import (
    Llm,
)
from fs_logging.core import write_logs
from typing import (
    Any,
    Coroutine,
    Dict,
    List,
    Literal,
    cast,
    get_args,
)
from openai.types.chat import ChatCompletionMessageParam
from routes.logging_utils import PaymentMethod, send_to_saas_backend
from routes.saas_utils import (
    SubscriptionCreditsCheckError,
    does_user_have_subscription_credits,
)
from utils import print_prompt_preview

# WebSocket message types
MessageType = Literal[
    "chunk",
    "status",
    "setCode",
    "error",
    "variantComplete",
    "variantError",
    "variantCount",
    "variantModels",
    "thinking",
    "assistant",
    "toolStart",
    "toolResult",
]
from prompts.pipeline import build_prompt_messages
from prompts.request_parsing import parse_prompt_content, parse_prompt_history
from prompts.prompt_types import PromptHistoryMessage, Stack, UserTurnInput
from agent.runner import Agent
from routes.model_choice_sets import (
    ALL_KEYS_MODELS_DEFAULT,
    ALL_KEYS_MODELS_TEXT_CREATE,
    ALL_KEYS_MODELS_UPDATE,
    ANTHROPIC_ONLY_MODELS,
    GEMINI_ANTHROPIC_MODELS,
    GEMINI_OPENAI_MODELS,
    GEMINI_ONLY_MODELS,
    OPENAI_ANTHROPIC_MODELS,
    OPENAI_ONLY_MODELS,
    VIDEO_VARIANT_MODELS,
)

# from utils import pprint_prompt
from ws.constants import APP_ERROR_WEB_SOCKET_CODE  # type: ignore


router = APIRouter()


@dataclass
class PipelineContext:
    """Context object that carries state through the pipeline"""

    websocket: WebSocket
    ws_comm: "WebSocketCommunicator | None" = None
    params: Dict[str, Any] = field(default_factory=dict)
    extracted_params: "ExtractedParams | None" = None
    prompt_messages: List[ChatCompletionMessageParam] = field(default_factory=list)
    variant_models: List[Llm] = field(default_factory=list)
    completions: List[str] = field(default_factory=list)
    variant_completions: Dict[int, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    generation_group_id: str = field(default_factory=generate)

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
        value: str | None,
        variantIndex: int,
        data: Dict[str, Any] | None = None,
        eventId: str | None = None,
    ) -> None:
        """Send a message to the client with debug logging"""
        if self.is_closed:
            return

        # Print for debugging on the backend
        if type == "error":
            print(f"Error (variant {variantIndex + 1}): {value}")
        elif type == "status":
            print(f"Status (variant {variantIndex + 1}): {value}")
        elif type == "variantComplete":
            print(f"Variant {variantIndex + 1} complete")
        elif type == "variantError":
            print(f"Variant {variantIndex + 1} error: {value}")

        try:
            payload: Dict[str, Any] = {"type": type, "variantIndex": variantIndex}
            if value is not None:
                payload["value"] = value
            if data is not None:
                payload["data"] = data
            if eventId is not None:
                payload["eventId"] = eventId
            await self.websocket.send_json(payload)
        except (ConnectionClosedOK, ConnectionClosedError):
            print(f"WebSocket closed by client, skipping message: {type}")
            self.is_closed = True

    async def throw_error(self, message: str) -> None:
        """Send an error message and close the connection"""
        print(message)
        if not self.is_closed:
            try:
                await self.websocket.send_json({"type": "error", "value": message})
                await self.websocket.close(APP_ERROR_WEB_SOCKET_CODE)
            except (ConnectionClosedOK, ConnectionClosedError):
                print("WebSocket already closed by client")
            self.is_closed = True

    async def receive_params(self) -> Dict[str, Any]:
        """Receive parameters from the client"""
        params: Dict[str, Any] = await self.websocket.receive_json()
        print("Received params")
        return params

    async def close(self) -> None:
        """Close the WebSocket connection"""
        if not self.is_closed:
            try:
                await self.websocket.close()
            except (ConnectionClosedOK, ConnectionClosedError):
                pass  # Already closed by client
            self.is_closed = True


@dataclass
class ExtractedParams:
    user_id: str
    stack: Stack
    input_mode: InputMode
    should_generate_images: bool
    openai_api_key: str | None
    anthropic_api_key: str | None
    gemini_api_key: str | None
    openai_base_url: str | None
    payment_method: PaymentMethod
    generation_type: Literal["create", "update"]
    prompt: UserTurnInput
    history: List[PromptHistoryMessage]
    file_state: Dict[str, str] | None
    option_codes: List[str]


class ParameterExtractionStage:
    """Handles parameter extraction and validation from WebSocket requests"""

    def __init__(self, throw_error: Callable[[str], Coroutine[Any, Any, None]]):
        self.throw_error = throw_error

    async def extract_and_validate(self, params: Dict[str, Any]) -> ExtractedParams:
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

        # Read the auth token from the request (on the hosted version)
        auth_token = params.get("authToken")
        if not auth_token:
            await self.throw_error("You need to be logged in to use screenshot to code")
            raise Exception("No auth token")

        openai_api_key = None
        anthropic_api_key = None
        gemini_api_key = None

        # Track how this generation is being paid for
        payment_method: PaymentMethod = PaymentMethod.UNKNOWN

        # If the user is a subscriber, use the platform API key
        # TODO: Rename does_user_have_subscription_credits
        try:
            res = await does_user_have_subscription_credits(auth_token)
        except SubscriptionCreditsCheckError as e:
            await self.throw_error(str(e))
            raise ValueError(str(e))
        if res.status != "not_subscriber":
            if (
                res.status == "subscriber_has_credits"
                or res.status == "subscriber_is_trialing"
            ):
                payment_method = (
                    PaymentMethod.SUBSCRIPTION
                    if res.status == "subscriber_has_credits"
                    else PaymentMethod.TRIAL
                )
                openai_api_key = PLATFORM_OPENAI_API_KEY
                anthropic_api_key = PLATFORM_ANTHROPIC_API_KEY
                gemini_api_key = PLATFORM_GEMINI_API_KEY
                print("Subscription - using platform API key")
            elif res.status == "subscriber_has_no_credits":
                await self.throw_error(
                    "Your subscription has run out of monthly credits. Contact support to upgrade your plan."
                )
            else:
                await self.throw_error("Unknown error occurred. Contact support.")
                raise Exception(
                    "Unknown error occurred when checking subscription credits"
                )

        user_id = res.user_id

        print("Payment method: ", payment_method)

        if payment_method is PaymentMethod.UNKNOWN:
            openai_api_key = self._get_from_settings_dialog_or_env(
                params, "openAiApiKey", None
            )

            if not openai_api_key:
                await self.throw_error(
                    "Please subscribe to a paid plan to generate code. If you are a subscriber and seeing this error, please contact support."
                )
            else:
                sentry_sdk.capture_exception(
                    Exception("OpenAI key is no longer supported")
                )
                await self.throw_error(
                    "Using your own OpenAI key is no longer supported due to the costs of running this website. Please subscribe to a paid plan to generate code. If you are a subscriber and seeing this error, please contact support."
                )

            if res.status != "not_subscriber":
                raise Exception("No payment method found")

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
        should_generate_images = (
            bool(params.get("isImageGenerationEnabled", True)) if not IS_PROD else True
        )

        # Extract and validate generation type
        generation_type = params.get("generationType", "create")
        if generation_type not in ["create", "update"]:
            await self.throw_error(f"Invalid generation type: {generation_type}")
            raise ValueError(f"Invalid generation type: {generation_type}")
        generation_type = cast(Literal["create", "update"], generation_type)

        # Extract prompt content
        prompt: UserTurnInput = parse_prompt_content(params.get("prompt"))

        # Extract history (default to empty list)
        history: List[PromptHistoryMessage] = parse_prompt_history(
            params.get("history")
        )

        # Extract file state for agent edits
        raw_file_state = params.get("fileState")
        file_state: Dict[str, str] | None = None
        if isinstance(raw_file_state, dict):
            content = raw_file_state.get("content")
            if isinstance(content, str) and content.strip():
                path = raw_file_state.get("path") or "index.html"
                file_state = {"path": path, "content": content}

        raw_option_codes = params.get("optionCodes")
        option_codes: List[str] = []
        if isinstance(raw_option_codes, list):
            for entry in raw_option_codes:
                if isinstance(entry, str):
                    option_codes.append(entry)
                elif entry is None:
                    option_codes.append("")
                else:
                    option_codes.append(str(entry))

        return ExtractedParams(
            user_id=user_id,
            stack=validated_stack,
            input_mode=validated_input_mode,
            should_generate_images=should_generate_images,
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key,
            gemini_api_key=gemini_api_key,
            openai_base_url=openai_base_url,
            payment_method=payment_method,
            generation_type=generation_type,
            prompt=prompt,
            history=history,
            file_state=file_state,
            option_codes=option_codes,
        )

    def _get_from_settings_dialog_or_env(
        self, params: dict[str, Any], key: str, env_var: str | None
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
            num_variants = 2 if generation_type == "update" else NUM_VARIANTS
            variant_models = self._get_variant_models(
                generation_type,
                input_mode,
                num_variants,
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
                "No OpenAI, Anthropic, or Gemini API key found. Please add the environment variable "
                "OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY to backend/.env or in the settings dialog. "
                "If you add it to .env, make sure to restart the backend server."
            )
            raise Exception("No API key")

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

        # Video mode requires Gemini - 2 variants for comparison
        if input_mode == "video":
            if not gemini_api_key:
                raise Exception(
                    "Video mode requires a Gemini API key. "
                    "Please add GEMINI_API_KEY to backend/.env or in the settings dialog"
                )
            return list(VIDEO_VARIANT_MODELS)

        # Edit/update mode prefers one Gemini + one OpenAI model for fast,
        # complementary deltas.
        if generation_type == "update" and gemini_api_key and openai_api_key:
            return [
                Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
                Llm.GPT_5_2_CODEX_LOW,
            ]

        # Define models based on available API keys
        if gemini_api_key and anthropic_api_key and openai_api_key:
            if input_mode == "text" and generation_type == "create":
                models = list(ALL_KEYS_MODELS_TEXT_CREATE)
            elif generation_type == "update":
                models = list(ALL_KEYS_MODELS_UPDATE)
            else:
                models = list(ALL_KEYS_MODELS_DEFAULT)
        elif gemini_api_key and anthropic_api_key:
            models = list(GEMINI_ANTHROPIC_MODELS)
        elif gemini_api_key and openai_api_key:
            models = list(GEMINI_OPENAI_MODELS)
        elif openai_api_key and anthropic_api_key:
            models = list(OPENAI_ANTHROPIC_MODELS)
        elif gemini_api_key:
            models = list(GEMINI_ONLY_MODELS)
        elif anthropic_api_key:
            models = list(ANTHROPIC_ONLY_MODELS)
        elif openai_api_key:
            models = list(OPENAI_ONLY_MODELS)
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

    async def build_prompt_messages(
        self,
        extracted_params: ExtractedParams,
    ) -> List[ChatCompletionMessageParam]:
        """Create prompt messages"""
        try:
            prompt_messages = await build_prompt_messages(
                stack=extracted_params.stack,
                input_mode=extracted_params.input_mode,
                generation_type=extracted_params.generation_type,
                prompt=extracted_params.prompt,
                history=extracted_params.history,
                file_state=extracted_params.file_state,
                image_generation_enabled=extracted_params.should_generate_images,
            )
            print_prompt_preview(prompt_messages)

            return prompt_messages
        except Exception:
            await self.throw_error(
                "Error assembling prompt. Contact support at support@picoapps.xyz"
            )
            raise


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
        if IS_PROD:
            return

        # Only process non-empty completions
        valid_completions = [comp for comp in completions if comp]

        # Write the first valid completion to logs for debugging
        if valid_completions:
            # Strip the completion of everything except the HTML content
            _html_content = extract_html_content(valid_completions[0])

        # Note: WebSocket closing is handled by the caller


class AgenticGenerationStage:
    """Handles agent tool-calling generation for each variant."""

    # Type annotations for class attributes
    send_message: Callable[
        [MessageType, str | None, int, Dict[str, Any] | None, str | None],
        Coroutine[Any, Any, None],
    ]
    openai_api_key: str | None
    openai_base_url: str | None
    anthropic_api_key: str | None
    gemini_api_key: str | None
    should_generate_images: bool
    prompt: UserTurnInput
    file_state: Dict[str, str] | None
    option_codes: List[str]
    user_id: str
    payment_method: PaymentMethod
    stack: Stack
    input_mode: InputMode
    generation_type: Literal["create", "update"]
    generation_group_id: str

    def __init__(
        self,
        send_message: Callable[
            [MessageType, str | None, int, Dict[str, Any] | None, str | None],
            Coroutine[Any, Any, None],
        ],
        openai_api_key: str | None,
        openai_base_url: str | None,
        anthropic_api_key: str | None,
        gemini_api_key: str | None,
        should_generate_images: bool,
        prompt: UserTurnInput,
        file_state: Dict[str, str] | None,
        option_codes: List[str] | None,
        user_id: str,
        payment_method: PaymentMethod,
        stack: Stack,
        input_mode: InputMode,
        generation_type: Literal["create", "update"],
        generation_group_id: str,
    ):
        self.send_message = send_message
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.anthropic_api_key = anthropic_api_key
        self.gemini_api_key = gemini_api_key
        self.should_generate_images = should_generate_images
        self.prompt = prompt
        self.file_state = file_state
        self.option_codes = option_codes or []
        self.user_id = user_id
        self.payment_method = payment_method
        self.stack = stack
        self.input_mode = input_mode
        self.generation_type = generation_type
        self.generation_group_id = generation_group_id


    async def process_variants(
        self,
        variant_models: List[Llm],
        prompt_messages: List[ChatCompletionMessageParam],
    ) -> Dict[int, str]:
        tasks: List[asyncio.Task[str]] = []
        for index, model in enumerate(variant_models):
            tasks.append(
                asyncio.create_task(
                    self._run_variant(index, model, prompt_messages)
                )
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)
        variant_completions: Dict[int, str] = {}
        for index, result in enumerate(results):
            if isinstance(result, BaseException):
                print(f"Variant {index + 1} failed: {result}")
                continue
            if result:
                variant_completions[index] = result

        return variant_completions

    async def _run_variant(
        self,
        index: int,
        model: Llm,
        prompt_messages: List[ChatCompletionMessageParam],
    ) -> str:
        start_time = time.perf_counter()
        try:
            async def send_runner_message(
                type: str,
                value: str | None,
                variant_index: int,
                data: Dict[str, Any] | None,
                event_id: str | None,
            ) -> None:
                await self.send_message(
                    cast(MessageType, type),
                    value,
                    variant_index,
                    data,
                    event_id,
                )

            runner = Agent(
                send_message=send_runner_message,
                variant_index=index,
                openai_api_key=self.openai_api_key,
                openai_base_url=self.openai_base_url,
                anthropic_api_key=self.anthropic_api_key,
                gemini_api_key=self.gemini_api_key,
                should_generate_images=self.should_generate_images,
                initial_file_state=self.file_state,
                option_codes=self.option_codes,
            )
            completion = await runner.run(model, prompt_messages)
            if completion:
                await self.send_message("setCode", completion, index, None, None)
            await self.send_message(
                "variantComplete",
                "Variant generation complete",
                index,
                None,
                None,
            )

            if completion and IS_PROD:
                try:
                    duration_seconds = time.perf_counter() - start_time
                    video_data_url = (
                        self.prompt.get("videos", [None])[0]
                        if self.input_mode == "video"
                        and self.generation_type == "create"
                        else None
                    )
                    await send_to_saas_backend(
                        user_id=self.user_id,
                        prompt_messages=prompt_messages,
                        completion=completion,
                        duration=duration_seconds,
                        llm_version=model,
                        generation_group_id=self.generation_group_id,
                        payment_method=self.payment_method,
                        stack=self.stack,
                        is_imported_from_code=False,
                        input_mode=self.input_mode,
                        other_info={"generation_type": self.generation_type},
                        video_data_url=video_data_url,
                        video_generation_cost=None,
                    )
                except Exception as e:
                    print("Error sending to SaaS backend", e)
                    sentry_sdk.capture_exception(e)

            return completion
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
            await self.send_message("variantError", error_message, index, None, None)
            return ""
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
            await self.send_message("variantError", error_message, index, None, None)
            return ""
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
            await self.send_message("variantError", error_message, index, None, None)
            return ""
        except Exception as e:
            print(f"Error in variant {index + 1}: {e}")
            traceback.print_exception(type(e), e, e.__traceback__)
            sentry_sdk.capture_exception(e)
            await self.send_message("variantError", str(e), index, None, None)
            return ""


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
        try:
            param_extractor = ParameterExtractionStage(context.throw_error)
            context.extracted_params = await param_extractor.extract_and_validate(
                context.params
            )
        except Exception as e:
            await context.throw_error(f"An unexpected error occurred: {str(e)}")
            sentry_sdk.capture_exception(e)
            return

        # Log what we're generating
        print(
            f"Generating {context.extracted_params.stack} code in {context.extracted_params.input_mode} mode"
        )

        # If the payment method is unknown, we shouldn't proceed
        if context.extracted_params.payment_method is PaymentMethod.UNKNOWN:
            await context.throw_error(
                "Payment method is unknown. Please contact support."
            )
            return

        await next_func()


class StatusBroadcastMiddleware(Middleware):
    """Sends initial status messages to all variants"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        # Determine variant count based on input mode and generation type.
        # Edit/update flows use two variants to keep latency and cost down.
        assert context.extracted_params is not None
        is_video_mode = context.extracted_params.input_mode == "video"
        is_update = context.extracted_params.generation_type == "update"
        num_variants = (
            NUM_VARIANTS_VIDEO
            if is_video_mode
            else 2 if is_update else NUM_VARIANTS
        )

        # Tell frontend how many variants we're using
        await context.send_message("variantCount", str(num_variants), 0)

        for i in range(num_variants):
            await context.send_message("status", "Generating code...", i)

        await next_func()


class PromptCreationMiddleware(Middleware):
    """Handles prompt creation"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        prompt_creator = PromptCreationStage(context.throw_error)
        assert context.extracted_params is not None
        context.prompt_messages = await prompt_creator.build_prompt_messages(
            context.extracted_params,
        )
        await next_func()


class CodeGenerationMiddleware(Middleware):
    """Handles the main code generation logic"""

    async def process(
        self, context: PipelineContext, next_func: Callable[[], Awaitable[None]]
    ) -> None:
        try:
            assert context.extracted_params is not None

            # Select models (handles video mode internally)
            model_selector = ModelSelectionStage(context.throw_error)
            context.variant_models = await model_selector.select_models(
                generation_type=context.extracted_params.generation_type,
                input_mode=context.extracted_params.input_mode,
                openai_api_key=context.extracted_params.openai_api_key,
                anthropic_api_key=context.extracted_params.anthropic_api_key,
                gemini_api_key=context.extracted_params.gemini_api_key,
            )
            if IS_DEBUG_ENABLED:
                await context.send_message(
                    "variantModels",
                    None,
                    0,
                    {"models": [model.value for model in context.variant_models]},
                    None,
                )

            generation_stage = AgenticGenerationStage(
                send_message=context.send_message,
                openai_api_key=context.extracted_params.openai_api_key,
                openai_base_url=context.extracted_params.openai_base_url,
                anthropic_api_key=context.extracted_params.anthropic_api_key,
                gemini_api_key=context.extracted_params.gemini_api_key,
                should_generate_images=context.extracted_params.should_generate_images,
                prompt=context.extracted_params.prompt,
                file_state=context.extracted_params.file_state,
                option_codes=context.extracted_params.option_codes,
                user_id=context.extracted_params.user_id,
                payment_method=context.extracted_params.payment_method,
                stack=context.extracted_params.stack,
                input_mode=context.extracted_params.input_mode,
                generation_type=context.extracted_params.generation_type,
                generation_group_id=context.generation_group_id,
            )

            context.variant_completions = await generation_stage.process_variants(
                variant_models=context.variant_models,
                prompt_messages=context.prompt_messages,
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
