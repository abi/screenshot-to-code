from dataclasses import dataclass
from typing import Any, Awaitable, Callable, List, Literal, Optional

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
class StepResult:
    assistant_text: str
    tool_calls: List[ToolCall]
    provider_state: Any = None


@dataclass
class ExecutedToolCall:
    tool_call: ToolCall
    result: ToolExecutionResult


EventSink = Callable[[StreamEvent], Awaitable[None]]
