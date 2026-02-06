from enum import Enum
from typing import TypedDict


# Actual model versions that are passed to the LLMs and stored in our logs
class Llm(Enum):
    # GPT
    GPT_4_1_2025_04_14 = "gpt-4.1-2025-04-14"
    GPT_5_2_CODEX_MEDIUM = "gpt-5.2-codex (medium thinking)"
    GPT_5_2_CODEX_HIGH = "gpt-5.2-codex (high thinking)"
    # Claude
    CLAUDE_4_5_SONNET_2025_09_29 = "claude-sonnet-4-5-20250929"
    CLAUDE_4_5_OPUS_2025_11_01 = "claude-opus-4-5-20251101"
    CLAUDE_OPUS_4_6 = "claude-opus-4-6"
    # Gemini
    GEMINI_3_FLASH_PREVIEW_HIGH = "gemini-3-flash-preview (high thinking)"
    GEMINI_3_FLASH_PREVIEW_MINIMAL = "gemini-3-flash-preview (minimal thinking)"
    GEMINI_3_PRO_PREVIEW_HIGH = "gemini-3-pro-preview (high thinking)"
    GEMINI_3_PRO_PREVIEW_LOW = "gemini-3-pro-preview (low thinking)"


class Completion(TypedDict):
    duration: float
    code: str


# Explicitly map each model to the provider backing it.  This keeps provider
# groupings authoritative and avoids relying on name conventions when checking
# models elsewhere in the codebase.
MODEL_PROVIDER: dict[Llm, str] = {
    # OpenAI models
    Llm.GPT_4_1_2025_04_14: "openai",
    Llm.GPT_5_2_CODEX_MEDIUM: "openai",
    Llm.GPT_5_2_CODEX_HIGH: "openai",
    # Anthropic models
    Llm.CLAUDE_4_5_SONNET_2025_09_29: "anthropic",
    Llm.CLAUDE_4_5_OPUS_2025_11_01: "anthropic",
    Llm.CLAUDE_OPUS_4_6: "anthropic",
    # Gemini models
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH: "gemini",
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL: "gemini",
    Llm.GEMINI_3_PRO_PREVIEW_HIGH: "gemini",
    Llm.GEMINI_3_PRO_PREVIEW_LOW: "gemini",
}

# Convenience sets for membership checks
OPENAI_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "openai"}
ANTHROPIC_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "anthropic"}
GEMINI_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "gemini"}

OPENAI_MODEL_CONFIG: dict[Llm, dict[str, str]] = {
    Llm.GPT_4_1_2025_04_14: {"api_name": "gpt-4.1-2025-04-14"},
    Llm.GPT_5_2_CODEX_MEDIUM: {"api_name": "gpt-5.2-codex", "reasoning_effort": "medium"},
    Llm.GPT_5_2_CODEX_HIGH: {"api_name": "gpt-5.2-codex", "reasoning_effort": "high"},
}


def get_openai_api_name(model: Llm) -> str:
    return OPENAI_MODEL_CONFIG[model]["api_name"]


def get_openai_reasoning_effort(model: Llm) -> str | None:
    return OPENAI_MODEL_CONFIG.get(model, {}).get("reasoning_effort")
