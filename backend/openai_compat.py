from urllib.parse import urlparse, urlunparse

OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HTTP_REFERER = "https://github.com/abi/screenshot-to-code"
OPENROUTER_APP_TITLE = "screenshot-to-code"


def is_openrouter_base_url(url: str | None) -> bool:
    if not url:
        return False
    host = urlparse(url.strip()).hostname or ""
    return host == "openrouter.ai" or host.endswith(".openrouter.ai")


def normalize_openai_base_url(url: str | None) -> str | None:
    """Trim a custom OpenAI-compatible base URL and complete OpenRouter paths."""
    if url is None:
        return None

    trimmed = url.strip()
    if not trimmed:
        return None

    if is_openrouter_base_url(trimmed):
        parsed = urlparse(trimmed)
        path = parsed.path.rstrip("/")
        if path in {"", "/api"}:
            parsed = parsed._replace(path="/api/v1")
            return urlunparse(parsed).rstrip("/")
        return trimmed.rstrip("/")

    return trimmed.rstrip("/")


def openai_client_headers(base_url: str | None) -> dict[str, str] | None:
    """OpenRouter ranks apps that send a referer and title."""
    if not is_openrouter_base_url(base_url):
        return None
    return {
        "HTTP-Referer": OPENROUTER_HTTP_REFERER,
        "X-Title": OPENROUTER_APP_TITLE,
    }
