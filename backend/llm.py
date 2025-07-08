from enum import Enum
from typing import TypedDict


# Actual model versions that are passed to the LLMs and stored in our logs
class Llm(Enum):
    GPT_4_VISION = "gpt-4-vision-preview"
    GPT_4_TURBO_2024_04_09 = "gpt-4-turbo-2024-04-09"
    GPT_4O_2024_05_13 = "gpt-4o-2024-05-13"
    GPT_4O_2024_08_06 = "gpt-4o-2024-08-06"
    GPT_4O_2024_11_20 = "gpt-4o-2024-11-20"
    GPT_4_1_2025_04_14 = "gpt-4.1-2025-04-14"
    GPT_4_1_MINI_2025_04_14 = "gpt-4.1-mini-2025-04-14"
    GPT_4_1_NANO_2025_04_14 = "gpt-4.1-nano-2025-04-14"
    CLAUDE_3_SONNET = "claude-3-sonnet-20240229"
    CLAUDE_3_OPUS = "claude-3-opus-20240229"
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"
    CLAUDE_3_5_SONNET_2024_06_20 = "claude-3-5-sonnet-20240620"
    CLAUDE_3_5_SONNET_2024_10_22 = "claude-3-5-sonnet-20241022"
    CLAUDE_3_7_SONNET_2025_02_19 = "claude-3-7-sonnet-20250219"
    CLAUDE_4_SONNET_2025_05_14 = "claude-sonnet-4-20250514"
    CLAUDE_4_OPUS_2025_05_14 = "claude-opus-4-20250514"
    GEMINI_1_0_PRO = "gemini-1.0-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"
    GEMINI_2_0_FLASH_EXP = "gemini-2.0-flash-exp"
    GEMINI_2_0_FLASH = "gemini-2.0-flash"
    GEMINI_2_0_PRO_EXP = "gemini-2.0-pro-exp-02-05"
    GEMINI_2_5_FLASH_PREVIEW_05_20 = "gemini-2.5-flash-preview-05-20"
    O1_2024_12_17 = "o1-2024-12-17"
    O4_MINI_2025_04_16 = "o4-mini-2025-04-16"
    O3_2025_04_16 = "o3-2025-04-16"


class Completion(TypedDict):
    duration: float
    code: str


# Explicitly map each model to the provider backing it.  This keeps provider
# groupings authoritative and avoids relying on name conventions when checking
# models elsewhere in the codebase.
MODEL_PROVIDER: dict[Llm, str] = {
    # OpenAI models
    Llm.GPT_4_VISION: "openai",
    Llm.GPT_4_TURBO_2024_04_09: "openai",
    Llm.GPT_4O_2024_05_13: "openai",
    Llm.GPT_4O_2024_08_06: "openai",
    Llm.GPT_4O_2024_11_20: "openai",
    Llm.GPT_4_1_2025_04_14: "openai",
    Llm.GPT_4_1_MINI_2025_04_14: "openai",
    Llm.GPT_4_1_NANO_2025_04_14: "openai",
    Llm.O1_2024_12_17: "openai",
    Llm.O4_MINI_2025_04_16: "openai",
    Llm.O3_2025_04_16: "openai",
    # Anthropic models
    Llm.CLAUDE_3_SONNET: "anthropic",
    Llm.CLAUDE_3_OPUS: "anthropic",
    Llm.CLAUDE_3_HAIKU: "anthropic",
    Llm.CLAUDE_3_5_SONNET_2024_06_20: "anthropic",
    Llm.CLAUDE_3_5_SONNET_2024_10_22: "anthropic",
    Llm.CLAUDE_3_7_SONNET_2025_02_19: "anthropic",
    Llm.CLAUDE_4_SONNET_2025_05_14: "anthropic",
    Llm.CLAUDE_4_OPUS_2025_05_14: "anthropic",
    # Gemini models
    Llm.GEMINI_1_0_PRO: "gemini",
    Llm.GEMINI_1_5_FLASH: "gemini",
    Llm.GEMINI_2_0_FLASH_EXP: "gemini",
    Llm.GEMINI_2_0_FLASH: "gemini",
    Llm.GEMINI_2_0_PRO_EXP: "gemini",
    Llm.GEMINI_2_5_FLASH_PREVIEW_05_20: "gemini",
}

# Convenience sets for membership checks
OPENAI_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "openai"}
ANTHROPIC_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "anthropic"}
GEMINI_MODELS = {m for m, p in MODEL_PROVIDER.items() if p == "gemini"}
