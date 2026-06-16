from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from agent.tools.local_assets import is_local_host_url


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

    def __post_init__(self) -> None:
        # Enforce the source invariant instead of trusting callers: exactly one
        # of data/image_url, and image_url must be model-reachable. A localhost
        # URL here would silently break Anthropic/OpenAI (they can't fetch it)
        # while only Gemini's download fallback worked.
        if (self.data is None) == (self.image_url is None):
            raise ValueError(
                "ToolMultimodalPart requires exactly one of `data` or `image_url`."
            )
        if self.image_url is not None and is_local_host_url(self.image_url):
            raise ValueError(
                "ToolMultimodalPart.image_url must be publicly fetchable, got a "
                f"localhost URL: {self.image_url!r}. Pass local images as `data` bytes."
            )


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
