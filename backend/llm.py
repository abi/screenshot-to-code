from enum import Enum
from typing import TypedDict

from config import ROUTER_COMBO


# Actual model versions that are passed to the LLMs and stored in our logs
class Llm(Enum):
    # GPT
    GPT_5_4_MINI_LOW = "gpt-5.4-mini (low thinking)"
    GPT_5_4_2026_03_05_NONE = "gpt-5.4-2026-03-05 (no thinking)"
    GPT_5_4_2026_03_05_LOW = "gpt-5.4-2026-03-05 (low thinking)"
    GPT_5_4_2026_03_05_MEDIUM = "gpt-5.4-2026-03-05 (medium thinking)"
    GPT_5_4_2026_03_05_HIGH = "gpt-5.4-2026-03-05 (high thinking)"
    GPT_5_4_2026_03_05_XHIGH = "gpt-5.4-2026-03-05 (xhigh thinking)"
    GPT_5_5_NONE = "gpt-5.5 (no thinking)"
    GPT_5_5_LOW = "gpt-5.5 (low thinking)"
    GPT_5_5_MEDIUM = "gpt-5.5 (medium thinking)"
    GPT_5_5_HIGH = "gpt-5.5 (high thinking)"
    GPT_5_5_XHIGH = "gpt-5.5 (xhigh thinking)"
    GPT_5_6_SOL_NONE = "gpt-5.6-sol (no thinking)"
    GPT_5_6_SOL_LOW = "gpt-5.6-sol (low thinking)"
    GPT_5_6_SOL_MEDIUM = "gpt-5.6-sol (medium thinking)"
    GPT_5_6_SOL_HIGH = "gpt-5.6-sol (high thinking)"
    GPT_5_6_SOL_XHIGH = "gpt-5.6-sol (xhigh thinking)"
    GPT_5_6_SOL_MAX = "gpt-5.6-sol (max thinking)"
    GPT_5_6_TERRA_LOW = "gpt-5.6-terra (low thinking)"
    # Claude
    CLAUDE_SONNET_4_6 = "claude-sonnet-4-6"
    CLAUDE_OPUS_5_LOW = "claude-opus-5 (low effort)"
    CLAUDE_OPUS_5_MEDIUM = "claude-opus-5 (medium effort)"
    CLAUDE_OPUS_5_HIGH = "claude-opus-5 (high effort)"
    CLAUDE_OPUS_5_XHIGH = "claude-opus-5 (xhigh effort)"
    CLAUDE_OPUS_5_MAX = "claude-opus-5 (max effort)"
    CLAUDE_OPUS_4_8_LOW = "claude-opus-4-8 (low effort)"
    CLAUDE_OPUS_4_8_MEDIUM = "claude-opus-4-8 (medium effort)"
    CLAUDE_OPUS_4_8_HIGH = "claude-opus-4-8 (high effort)"
    CLAUDE_OPUS_4_8_XHIGH = "claude-opus-4-8 (xhigh effort)"
    CLAUDE_OPUS_4_8_MAX = "claude-opus-4-8 (max effort)"
    CLAUDE_FABLE_5_LOW = "claude-fable-5 (low effort)"
    CLAUDE_FABLE_5_MEDIUM = "claude-fable-5 (medium effort)"
    CLAUDE_FABLE_5_HIGH = "claude-fable-5 (high effort)"
    CLAUDE_FABLE_5_XHIGH = "claude-fable-5 (xhigh effort)"
    CLAUDE_FABLE_5_MAX = "claude-fable-5 (max effort)"
    # Gemini
    GEMINI_3_FLASH_PREVIEW_HIGH = "gemini-3-flash-preview (high thinking)"
    GEMINI_3_FLASH_PREVIEW_MINIMAL = "gemini-3-flash-preview (minimal thinking)"
    GEMINI_3_1_PRO_PREVIEW_HIGH = "gemini-3.1-pro-preview (high thinking)"
    GEMINI_3_1_PRO_PREVIEW_MEDIUM = "gemini-3.1-pro-preview (medium thinking)"
    GEMINI_3_1_PRO_PREVIEW_LOW = "gemini-3.1-pro-preview (low thinking)"
    GEMINI_3_5_FLASH_HIGH = "gemini-3.5-flash (high thinking)"
    GEMINI_3_5_FLASH_MEDIUM = "gemini-3.5-flash (medium thinking)"
    GEMINI_3_5_FLASH_LOW = "gemini-3.5-flash (low thinking)"
    GEMINI_3_5_FLASH_MINIMAL = "gemini-3.5-flash (minimal thinking)"
    GEMINI_3_6_FLASH_HIGH = "gemini-3.6-flash (high thinking)"
    GEMINI_3_6_FLASH_MEDIUM = "gemini-3.6-flash (medium thinking)"
    GEMINI_3_6_FLASH_LOW = "gemini-3.6-flash (low thinking)"
    GEMINI_3_6_FLASH_MINIMAL = "gemini-3.6-flash (minimal thinking)"


class Completion(TypedDict):
    duration: float
    code: str


# Keep the upstream provider groupings intact. When a 9Router combo is
# configured, the provider factory intercepts the request before these sets are
# used and sends the combo name to 9Router as the OpenAI-compatible model ID.
MODEL_PROVIDER: dict[Llm, str] = {}
for _model in Llm:
    if _model.value.startswith("gpt-"):
        MODEL_PROVIDER[_model] = "openai"
    elif _model.value.startswith("claude-"):
        MODEL_PROVIDER[_model] = "anthropic"
    else:
        MODEL_PROVIDER[_model] = "gemini"

OPENAI_MODELS = {m for m, provider in MODEL_PROVIDER.items() if provider == "openai"}
ANTHROPIC_MODELS = {m for m, provider in MODEL_PROVIDER.items() if provider == "anthropic"}
GEMINI_MODELS = {m for m, provider in MODEL_PROVIDER.items() if provider == "gemini"}

OPENAI_MODEL_CONFIG: dict[Llm, dict[str, str]] = {
    Llm.GPT_5_4_MINI_LOW: {"api_name": "gpt-5.4-mini", "reasoning_effort": "low"},
    Llm.GPT_5_4_2026_03_05_NONE: {"api_name": "gpt-5.4-2026-03-05", "reasoning_effort": "none"},
    Llm.GPT_5_4_2026_03_05_LOW: {"api_name": "gpt-5.4-2026-03-05", "reasoning_effort": "low"},
    Llm.GPT_5_4_2026_03_05_MEDIUM: {"api_name": "gpt-5.4-2026-03-05", "reasoning_effort": "medium"},
    Llm.GPT_5_4_2026_03_05_HIGH: {"api_name": "gpt-5.4-2026-03-05", "reasoning_effort": "high"},
    Llm.GPT_5_4_2026_03_05_XHIGH: {"api_name": "gpt-5.4-2026-03-05", "reasoning_effort": "xhigh"},
    Llm.GPT_5_5_NONE: {"api_name": "gpt-5.5", "reasoning_effort": "none"},
    Llm.GPT_5_5_LOW: {"api_name": "gpt-5.5", "reasoning_effort": "low"},
    Llm.GPT_5_5_MEDIUM: {"api_name": "gpt-5.5", "reasoning_effort": "medium"},
    Llm.GPT_5_5_HIGH: {"api_name": "gpt-5.5", "reasoning_effort": "high"},
    Llm.GPT_5_5_XHIGH: {"api_name": "gpt-5.5", "reasoning_effort": "xhigh"},
    Llm.GPT_5_6_SOL_NONE: {"api_name": "gpt-5.6-sol", "reasoning_effort": "none"},
    Llm.GPT_5_6_SOL_LOW: {"api_name": "gpt-5.6-sol", "reasoning_effort": "low"},
    Llm.GPT_5_6_SOL_MEDIUM: {"api_name": "gpt-5.6-sol", "reasoning_effort": "medium"},
    Llm.GPT_5_6_SOL_HIGH: {"api_name": "gpt-5.6-sol", "reasoning_effort": "high"},
    Llm.GPT_5_6_SOL_XHIGH: {"api_name": "gpt-5.6-sol", "reasoning_effort": "xhigh"},
    Llm.GPT_5_6_SOL_MAX: {"api_name": "gpt-5.6-sol", "reasoning_effort": "max"},
    Llm.GPT_5_6_TERRA_LOW: {"api_name": "gpt-5.6-terra", "reasoning_effort": "low"},
}


def get_openai_api_name(model: Llm) -> str:
    # A combo is a virtual model name. 9Router owns all downstream model
    # selection, so screenshot-to-code must never substitute an individual
    # provider model here.
    return ROUTER_COMBO or OPENAI_MODEL_CONFIG[model]["api_name"]


def get_openai_reasoning_effort(model: Llm) -> str | None:
    # Reasoning is controlled by the selected upstream model inside the combo.
    if ROUTER_COMBO:
        return None
    return OPENAI_MODEL_CONFIG.get(model, {}).get("reasoning_effort")
