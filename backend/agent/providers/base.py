from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Literal, Optional, Protocol

from agent.tools import ToolCall, ToolExecutionResult


StreamEventType = Literal[
    "assistant_delta",
    "thinking_delta",
    "tool_call_delta",
]


@dataclass
class StreamEvent:
    type: StreamEventType
    text: str = ""
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_arguments: Any = None


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

    Total input sent to the model = input + cache_read.
    Cost = (input * input_rate + output * output_rate
            + cache_read * cache_read_rate + cache_write * cache_write_rate)
           / 1_000_000
    """

    input: int = 0
    output: int = 0
    cache_read: int = 0
    cache_write: int = 0
    total: int = 0

    def accumulate(self, other: "TokenUsage") -> None:
        self.input += other.input
        self.output += other.output
        self.cache_read += other.cache_read
        self.cache_write += other.cache_write
        self.total += other.total

    def cost(self, pricing: "ModelPricing") -> float:
        """Compute cost in USD using per-million-token rates."""
        return (
            self.input * pricing.input
            + self.output * pricing.output
            + self.cache_read * pricing.cache_read
            + self.cache_write * pricing.cache_write
        ) / 1_000_000


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


@dataclass
class ProviderTurn:
    assistant_text: str
    tool_calls: list[ToolCall]
    # Provider-native assistant turn object required to continue the conversation.
    assistant_turn: Any = None


@dataclass
class ExecutedToolCall:
    tool_call: ToolCall
    result: ToolExecutionResult


EventSink = Callable[[StreamEvent], Awaitable[None]]


class ProviderSession(Protocol):
    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        ...

    def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        ...

    async def close(self) -> None:
        ...
