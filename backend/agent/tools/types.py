from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ToolExecutionResult:
    ok: bool
    result: Dict[str, Any]
    summary: Dict[str, Any]
    updated_content: Optional[str] = None


@dataclass(frozen=True)
class CanonicalToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]
