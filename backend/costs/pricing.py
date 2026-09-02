from dataclasses import dataclass
from typing import Dict


@dataclass
class ModelPricing:
    """Per-million-token pricing in USD."""

    input: float = 0.0
    output: float = 0.0
    cache_read: float = 0.0
    cache_write: float = 0.0


# Pricing keyed by the API model name string sent to the provider.
MODEL_PRICING: Dict[str, ModelPricing] = {
    # --- OpenAI ---
    # Verified against developers.openai.com/api/docs/pricing on 2026-07-24.
    "gpt-5.4-mini": ModelPricing(
        input=0.75, output=4.50, cache_read=0.075
    ),
    "gpt-5.4-2026-03-05": ModelPricing(
        input=2.50, output=15.00, cache_read=0.25
    ),
    "gpt-5.5": ModelPricing(
        input=5.00, output=30.00, cache_read=0.50
    ),
    "gpt-5.6-sol": ModelPricing(
        input=5.00, output=30.00, cache_read=0.50
    ),
    "gpt-5.6-terra": ModelPricing(
        input=2.50, output=15.00, cache_read=0.25
    ),
    # --- Anthropic ---
    # Verified against platform.claude.com/docs/en/about-claude/pricing on
    # 2026-07-24. cache_write is the 5-minute cache-write rate (1.25x input).
    "claude-sonnet-4-6": ModelPricing(
        input=3.00, output=15.00, cache_read=0.30, cache_write=3.75
    ),
    "claude-opus-5": ModelPricing(
        input=5.00, output=25.00, cache_read=0.50, cache_write=6.25
    ),
    "claude-opus-4-8": ModelPricing(
        input=5.00, output=25.00, cache_read=0.50, cache_write=6.25
    ),
    "claude-fable-5": ModelPricing(
        input=10.00, output=50.00, cache_read=1.00, cache_write=12.50
    ),
    # --- Gemini ---
    # Verified against ai.google.dev/gemini-api/docs/pricing on 2026-07-24.
    # Pro models bill higher rates for prompts >200k tokens ($4/$18 for 3.1
    # Pro); this flat table uses the <=200k tier, so long-context costs are
    # underestimated.
    "gemini-3-flash-preview": ModelPricing(
        input=0.50, output=3.00, cache_read=0.05
    ),
    "gemini-3-pro-preview": ModelPricing(
        input=2.00, output=12.00, cache_read=0.20
    ),
    "gemini-3.1-pro-preview": ModelPricing(
        input=2.00, output=12.00, cache_read=0.20
    ),
    "gemini-3.5-flash": ModelPricing(
        input=1.50, output=9.00, cache_read=0.15
    ),
    "gemini-3.6-flash": ModelPricing(
        input=1.50, output=7.50, cache_read=0.15
    ),
    # --- NVIDIA ---
    # Estimated pricing for Nemotron 3.5 Flash models (2026-08-31).
    "nvidia/nemotron-3.5-lightning-30b-a3b": ModelPricing(
        input=2.00, output=12.00, cache_read=0.20
    ),
}
