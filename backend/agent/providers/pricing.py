from typing import Dict

from agent.providers.token_usage import ModelPricing

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
