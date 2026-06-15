from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ToolMultimodalPart:
    """An image a tool wants the model to see.

    Exactly one source is set: ``data`` for local images (sent as bytes to
    Gemini / base64 to Anthropic & OpenAI), or ``image_url`` for a publicly
    reachable URL (e.g. replicate.delivery) which Anthropic & OpenAI fetch
    directly and Gemini downloads to bytes.
    """

    display_name: str
    mime_type: str
    data: Optional[bytes] = None
    image_url: Optional[str] = None


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
