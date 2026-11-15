"""Agent runtime modes: structured-output strategy and tool-call policy.

These types are intentionally provider-agnostic so that the pipeline config
lives in one place (config.py / factory.py) and each provider maps the mode to
its own API knobs independently.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal


# -------------------------------------------------------------------------- #
# StructuredOutputMode — which output format the model should produce.
# -------------------------------------------------------------------------- #
class StructuredOutputMode(Enum):
    """Output format strategy for the agent's LLM calls.

    Ordered from most flexible (free-form) to most constrained (forced tool).
    The factory maps each value to provider-native parameters.
    """

    # The model may return plain text / free-form JSON.  Tool calls are
    # preferred but not required.  Safe default for new models that have
    # strong JSON reasoning capabilities.
    FREE = "free"

    # The model is instructed to emit JSON matching the tool schema via a
    # structured-output / JSON-schema guarantee.  Tool calls remain optional
    # (the model can still return text).  Useful for mid-generation models
    # that occasionally emit malformed JSON.
    PREFER_JSON = "prefer_json"

    # The model is forced to emit a tool call on every turn.  Recommended for
    # models that frequently skip tool invocations or that do not yet have
    # reliable JSON-mode support (e.g. legacy o1-preview / o3-mini variants).
    FORCE_TOOL = "force_tool"


# -------------------------------------------------------------------------- #
# ToolCallPolicy — per-step tool-call enforcement level.
# -------------------------------------------------------------------------- #
class ToolCallPolicy(Enum):
    """Policy that gates whether the agent is allowed to emit a plain text
    response instead of a tool call on any given step.

    Unlike ``StructuredOutputMode`` which controls the *format* of the output,
    ``ToolCallPolicy`` controls whether a step is allowed to terminate without
    a tool invocation at all.
    """

    # No constraint — the model may emit text or a tool call at each step.
    FREE = "free"

    # If the model emits text without a tool call, log a warning and count the
    # step.  The run continues; the warning is emitted to the recorder / logs.
    WARN = "warn"

    # The agent must emit at least one tool call per step.  If the model emits
    # plain text without any tool invocation, raise ``UnexpectedTextStepError``
    # (a subclass of ``AgentStepError``) and mark the step as failed.
    REQUIRED = "required"


# -------------------------------------------------------------------------- #
# Mapping helpers used by the factory / provider initialisation.
# -------------------------------------------------------------------------- #

# OpenAI Responses API tool_choice values that correspond to each mode.
OPENAI_TOOL_CHOICE: dict[StructuredOutputMode, str] = {
    StructuredOutputMode.FREE: "auto",
    StructuredOutputMode.PREFER_JSON: "auto",  # JSON-mode is set via response_format
    StructuredOutputMode.FORCE_TOOL: "required",
}

# Anthropic tool-choice / prompt strategy per mode.
# Anthropic does not have an equivalent of OpenAI's "required" tool_choice;
# we simulate it by prepending an invisible system nudge.
ANTHROPIC_TOOL_NUDGE: dict[StructuredOutputMode, str | None] = {
    StructuredOutputMode.FREE: None,
    StructuredOutputMode.PREFER_JSON: None,
    StructuredOutputMode.FORCE_TOOL: (
        "You must call exactly one tool on every turn. "
        "Do not respond with plain text."
    ),
}
