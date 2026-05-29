from enum import Enum
from typing import TypedDict
from typing_extensions import NotRequired


# Actual model versions that are passed to the LLMs and stored in our logs
# Keep in sync with s2c-saas repo & DB column `llm_version`
class Llm(Enum):
    # GPT
    GPT_5_2_CODEX_LOW = "gpt-5.2-codex (low thinking)"
    GPT_5_2_CODEX_MEDIUM = "gpt-5.2-codex (medium thinking)"
    GPT_5_2_CODEX_HIGH = "gpt-5.2-codex (high thinking)"
    GPT_5_2_CODEX_XHIGH = "gpt-5.2-codex (xhigh thinking)"
    GPT_5_4_MINI_LOW = "gpt-5.4-mini (low thinking)"
    GPT_5_4_2026_03_05_NONE = "gpt-5.4-2026-03-05 (no thinking)"
    GPT_5_4_2026_03_05_LOW = "gpt-5.4-2026-03-05 (low thinking)"
    GPT_5_4_2026_03_05_MEDIUM = "gpt-5.4-2026-03-05 (medium thinking)"
    GPT_5_4_2026_03_05_HIGH = "gpt-5.4-2026-03-05 (high thinking)"
    GPT_5_4_2026_03_05_XHIGH = "gpt-5.4-2026-03-05 (xhigh thinking)"
    GPT_5_5_XHIGH = "gpt-5.5 (xhigh thinking)"
    # Claude
    CLAUDE_SONNET_4_6 = "claude-sonnet-4-6"
    CLAUDE_OPUS_4_6 = "claude-opus-4-6"
    CLAUDE_OPUS_4_8_LOW = "claude-opus-4-8 (low effort)"
    CLAUDE_OPUS_4_8_MEDIUM = "claude-opus-4-8 (medium effort)"
    CLAUDE_OPUS_4_8_HIGH = "claude-opus-4-8 (high effort)"
    CLAUDE_OPUS_4_8_XHIGH = "claude-opus-4-8 (xhigh effort)"
    CLAUDE_OPUS_4_8_MAX = "claude-opus-4-8 (max effort)"
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


class Completion(TypedDict):
    duration: float
    code: str
    cost: NotRequired[float]


# Explicitly map each model to the provider backing it.  This keeps provider
# groupings authoritative and avoids relying on name conventions when checking
# models elsewhere in the codebase.
MODEL_PROVIDER: dict[Llm, str] = {
    # OpenAI models
    Llm.GPT_5_2_CODEX_LOW: "openai",
    Llm.GPT_5_2_CODEX_MEDIUM: "openai",
    Llm.GPT_5_2_CODEX_HIGH: "openai",
    Llm.GPT_5_2_CODEX_XHIGH: "openai",
    Llm.GPT_5_4_MINI_LOW: "openai",
    Llm.GPT_5_4_2026_03_05_NONE: "openai",
    Llm.GPT_5_4_2026_03_05_LOW: "openai",
    Llm.GPT_5_4_2026_03_05_MEDIUM: "openai",
    Llm.GPT_5_4_2026_03_05_HIGH: "openai",
    Llm.GPT_5_4_2026_03_05_XHIGH: "openai",
    Llm.GPT_5_5_XHIGH: "openai",
    # Anthropic models
    Llm.CLAUDE_SONNET_4_6: "anthropic",
    Llm.CLAUDE_OPUS_4_6: "anthropic",
    Llm.CLAUDE_OPUS_4_8_LOW: "anthropic",
    Llm.CLAUDE_OPUS_4_8_MEDIUM: "anthropic",
    Llm.CLAUDE_OPUS_4_8_HIGH: "anthropic",
    Llm.CLAUDE_OPUS_4_8_XHIGH: "anthropic",
    Llm.CLAUDE_OPUS_4_8_MAX: "anthropic",
    # Gemini models
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH: "gemini",
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL: "gemini",
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH: "gemini",
    Llm.GEMINI_3_1_PRO_PREVIEW_MEDIUM: "gemini",
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW: "gemini",
    Llm.GEMINI_3_5_FLASH_HIGH: "gemini",
    Llm.GEMINI_3_5_FLASH_MEDIUM: "gemini",
    Llm.GEMINI_3_5_FLASH_LOW: "gemini",
    Llm.GEMINI_3_5_FLASH_MINIMAL: "gemini",
}

# Convenience sets for membership checks
OPENAI_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "openai"}
ANTHROPIC_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "anthropic"}
GEMINI_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "gemini"}

OPENAI_MODEL_CONFIG: dict[Llm, dict[str, str]] = {
    Llm.GPT_5_2_CODEX_LOW: {"api_name": "gpt-5.2-codex", "reasoning_effort": "low"},
    Llm.GPT_5_2_CODEX_MEDIUM: {"api_name": "gpt-5.2-codex", "reasoning_effort": "medium"},
    Llm.GPT_5_2_CODEX_HIGH: {"api_name": "gpt-5.2-codex", "reasoning_effort": "high"},
    Llm.GPT_5_2_CODEX_XHIGH: {"api_name": "gpt-5.2-codex", "reasoning_effort": "xhigh"},
    Llm.GPT_5_4_MINI_LOW: {"api_name": "gpt-5.4-mini", "reasoning_effort": "low"},
    Llm.GPT_5_4_2026_03_05_NONE: {
        "api_name": "gpt-5.4-2026-03-05",
        "reasoning_effort": "none",
    },
    Llm.GPT_5_4_2026_03_05_LOW: {
        "api_name": "gpt-5.4-2026-03-05",
        "reasoning_effort": "low",
    },
    Llm.GPT_5_4_2026_03_05_MEDIUM: {
        "api_name": "gpt-5.4-2026-03-05",
        "reasoning_effort": "medium",
    },
    Llm.GPT_5_4_2026_03_05_HIGH: {
        "api_name": "gpt-5.4-2026-03-05",
        "reasoning_effort": "high",
    },
    Llm.GPT_5_4_2026_03_05_XHIGH: {
        "api_name": "gpt-5.4-2026-03-05",
        "reasoning_effort": "xhigh",
    },
    Llm.GPT_5_5_XHIGH: {"api_name": "gpt-5.5", "reasoning_effort": "xhigh"},
}


def get_openai_api_name(model: Llm) -> str:
    return OPENAI_MODEL_CONFIG[model]["api_name"]


def get_openai_reasoning_effort(model: Llm) -> str | None:
    return OPENAI_MODEL_CONFIG.get(model, {}).get("reasoning_effort")
