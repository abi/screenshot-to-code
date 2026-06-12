from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ToolMultimodalPart:
    display_name: str
    mime_type: str
    data: bytes


@dataclass
class ToolExecutionResult:
    ok: bool
    result: Dict[str, Any]
    summary: Dict[str, Any]
    updated_content: Optional[str] = None
    multimodal_parts: Optional[List[ToolMultimodalPart]] = None


@dataclass(frozen=True)
class CanonicalToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]
