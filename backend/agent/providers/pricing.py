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
    "gpt-4.1-2025-04-14": ModelPricing(
        input=2.00, output=8.00, cache_read=0.50
    ),
    "gpt-5.2-codex": ModelPricing(
        input=1.75, output=14.00, cache_read=0.4375
    ),
    "gpt-5.3-codex": ModelPricing(
        input=1.75, output=14.00, cache_read=0.4375
    ),
    "gpt-5.4-mini": ModelPricing(
        input=0.40, output=3.20, cache_read=0.10
    ),
    "gpt-5.4-2026-03-05": ModelPricing(
        input=2.50, output=15.00, cache_read=0.25
    ),
    # --- Anthropic ---
    "claude-sonnet-4-6": ModelPricing(
        input=3.00, output=15.00, cache_read=0.30, cache_write=3.75
    ),
    "claude-sonnet-4-5-20250929": ModelPricing(
        input=3.00, output=15.00, cache_read=0.30, cache_write=3.75
    ),
    "claude-opus-4-5-20251101": ModelPricing(
        input=5.00, output=25.00, cache_read=0.50, cache_write=6.25
    ),
    "claude-opus-4-6": ModelPricing(
        input=5.00, output=25.00, cache_read=0.50, cache_write=6.25
    ),
    # --- Gemini ---
    "gemini-3-flash-preview": ModelPricing(
        input=0.50, output=3.00, cache_read=0.05
    ),
    "gemini-3-pro-preview": ModelPricing(
        input=2.00, output=12.00, cache_read=0.20
    ),
    "gemini-3.1-pro-preview": ModelPricing(
        input=2.00, output=12.00, cache_read=0.20
    ),
}
