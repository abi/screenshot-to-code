from agent.providers.base import (
    EventSink,
    ExecutedToolCall,
    ProviderTurn,
    StreamEvent,
)

# Backwards-compatible alias for older imports.
StepResult = ProviderTurn

__all__ = [
    "EventSink",
    "ExecutedToolCall",
    "ProviderTurn",
    "StepResult",
    "StreamEvent",
]
