import uuid
from datetime import datetime

from config import (
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    LOCAL_ASSET_BASE_URL,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    REPLICATE_API_KEY,
)
from llm import Llm, OPENAI_MODELS, ANTHROPIC_MODELS, GEMINI_MODELS
from agent.runner import Agent
from fs_logging.agent_runs import AgentRunRecorder
from prompts.create.image import build_image_prompt_messages
from prompts.create.text import build_text_prompt_messages
from prompts.prompt_types import Stack
from openai.types.chat import ChatCompletionMessageParam
from typing import Any, List


async def _run_eval_agent(
    prompt_messages: List[ChatCompletionMessageParam],
    stack: Stack,
    model: Llm,
    input_mode: str,
    eval_set: str | None,
    eval_session_id: str | None,
    input_file: str | None,
    skip_screenshot_preview: bool = False,
) -> str:
    async def send_message(
        _: str,
        __: str | None,
        ___: int,
        ____: dict[str, Any] | None = None,
        _____: str | None = None,
    ) -> None:
        # Evals do not stream tool/assistant messages to a frontend.
        return None

    if model in ANTHROPIC_MODELS and not ANTHROPIC_API_KEY:
        raise Exception("Anthropic API key not found")
    if model in GEMINI_MODELS and not GEMINI_API_KEY:
        raise Exception("Gemini API key not found")
    if model in OPENAI_MODELS and not OPENAI_API_KEY:
        raise Exception("OpenAI API key not found")

    print(f"[EVALS] Using agent runner for model: {model.value}")

    recorder = AgentRunRecorder(
        generation_id=(
            f"gen_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        ),
        variant_index=0,
        entry_point="eval",
        stack=str(stack),
        input_mode=input_mode,
        generation_type="create",
        eval_session=eval_session_id,
        eval_set=eval_set,
        input_file=input_file,
    )
    runner = Agent(
        send_message=send_message,
        variant_index=0,
        openai_api_key=OPENAI_API_KEY,
        openai_base_url=OPENAI_BASE_URL,
        anthropic_api_key=ANTHROPIC_API_KEY,
        gemini_api_key=GEMINI_API_KEY,
        replicate_api_key=REPLICATE_API_KEY,
        should_generate_images=True,
        # No websocket to infer the host from, so use the configured base URL;
        # otherwise extracted/saved assets get hostless /local-assets/ URLs.
        asset_base_url=LOCAL_ASSET_BASE_URL,
        initial_file_state=None,
        option_codes=None,
        recorder=recorder,
        skip_screenshot_preview=skip_screenshot_preview,
    )
    return await runner.run(model, prompt_messages)


async def generate_code_for_image(
    image_url: str,
    stack: Stack,
    model: Llm,
    *,
    eval_set: str | None = None,
    eval_session_id: str | None = None,
    input_file: str | None = None,
    skip_screenshot_preview: bool = False,
) -> str:
    prompt_messages = build_image_prompt_messages(
        image_data_urls=[image_url],
        stack=stack,
        text_prompt="",
        image_generation_enabled=True,
    )
    return await _run_eval_agent(
        prompt_messages,
        stack,
        model,
        input_mode="image",
        eval_set=eval_set,
        eval_session_id=eval_session_id,
        input_file=input_file,
        skip_screenshot_preview=skip_screenshot_preview,
    )


async def generate_code_for_text(
    text_prompt: str,
    stack: Stack,
    model: Llm,
    *,
    eval_set: str | None = None,
    eval_session_id: str | None = None,
    input_file: str | None = None,
    skip_screenshot_preview: bool = False,
) -> str:
    """Text-create eval: same prompt construction as the app's text flow."""
    prompt_messages = build_text_prompt_messages(
        text_prompt=text_prompt,
        stack=stack,
        image_generation_enabled=True,
    )
    return await _run_eval_agent(
        prompt_messages,
        stack,
        model,
        input_mode="text",
        eval_set=eval_set,
        eval_session_id=eval_session_id,
        input_file=input_file,
        skip_screenshot_preview=skip_screenshot_preview,
    )
