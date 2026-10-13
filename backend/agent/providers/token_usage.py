from __future__ import annotations

from dataclasses import dataclass

from agent.providers.pricing import ModelPricing


@dataclass
class TokenUsage:
    """Unified token usage across all providers.

    Log line example:
        [TOKEN USAGE] provider=gemini model=... | input=1000 output=500
            cache_read=200 cache_write=0 total=1700 cost=$0.0020

    Fields:
        input:       Non-cached input tokens (billed at full input rate).
                     For providers whose API includes cached tokens in the
                     prompt count (OpenAI, Gemini), cached tokens are
                     subtracted so this is always *exclusive* of cache_read.
        output:      Output tokens including thinking/reasoning (billed at
                     output rate).
        cache_read:  Input tokens served from cache (billed at reduced rate).
        cache_write: Input tokens written to cache (Anthropic only).
        total:       All tokens as reported by the provider API. Equals
                     input + cache_read + output (+ thinking for Gemini).

    Total input sent to the model = input + cache_read + cache_write.
    Cost = (input * input_rate + output * output_rate
            + cache_read * cache_read_rate + cache_write * cache_write_rate)
           / 1_000_000
    """

    input: int = 0
    output: int = 0
    cache_read: int = 0
    cache_write: int = 0
    total: int = 0

    def accumulate(self, other: TokenUsage) -> None:
        self.input += other.input
        self.output += other.output
        self.cache_read += other.cache_read
        self.cache_write += other.cache_write
        self.total += other.total

    def cost(self, pricing: ModelPricing) -> float:
        """Compute cost in USD using per-million-token rates."""
        return (
            self.input * pricing.input
            + self.output * pricing.output
            + self.cache_read * pricing.cache_read
            + self.cache_write * pricing.cache_write
        ) / 1_000_000

    def total_input_tokens(self) -> int:
        """All input tokens, including non-cached, cache-read, and cache-write."""
        return self.input + self.cache_read + self.cache_write

    def cache_hit_rate_percent(self) -> float:
        """Percent of total input tokens served from cache."""
        total_input = self.total_input_tokens()
        if total_input == 0:
            return 0.0
        return (self.cache_read / total_input) * 100.0
