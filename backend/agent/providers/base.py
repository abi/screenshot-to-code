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

    Fields:
        input:       Non-cached input (prompt) tokens.
        output:      Output tokens (includes thinking/reasoning where applicable).
        cache_read:  Cached input tokens read.
        cache_write: Cached input tokens written (Anthropic only).
        total:       Total tokens as reported by the provider, or computed.
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
