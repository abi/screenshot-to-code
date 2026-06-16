"""Helpers for handing locally-served assets to external image APIs.

Replicate (and other hosted model APIs) can't fetch ``localhost`` URLs, so any
asset served by this backend must be inlined as a base64 ``data:`` URL before
being sent. Tools that pass image inputs to Replicate (``remove_background``,
``edit_image``) route their URLs through here.
"""

import base64
import mimetypes
import os
from urllib.parse import unquote, urlparse

from config import LOCAL_ASSET_DIR

LOCAL_ASSET_HOSTS = {"127.0.0.1", "localhost", "::1"}


def is_local_host_url(url: str) -> bool:
    """True if the URL points at this host (a loopback address).

    Such URLs are reachable from this backend but NOT from cloud model APIs
    (Anthropic, OpenAI), so they must never be handed to a model as a URL.
    """
    return (urlparse(url).hostname or "").lower() in LOCAL_ASSET_HOSTS


def guess_image_mime(url: str) -> str:
    """Best-effort image MIME from a URL's extension; defaults to PNG."""
    return mimetypes.guess_type(urlparse(url).path)[0] or "image/png"


def local_asset_url_to_bytes(image_url: str) -> tuple[bytes, str] | None:
    """Read a localhost ``/local-assets/`` URL into ``(bytes, mime_type)``.

    Returns ``None`` for anything that isn't a local asset backed by a real
    file under ``LOCAL_ASSET_DIR`` (external URLs, data URLs, traversal, etc.).
    """
    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.hostname not in LOCAL_ASSET_HOSTS:
        return None
    if not parsed.path.startswith("/local-assets/"):
        return None

    relative_path = unquote(parsed.path.removeprefix("/local-assets/"))
    asset_root = os.path.abspath(LOCAL_ASSET_DIR)
    asset_path = os.path.abspath(os.path.join(asset_root, relative_path))
    if not asset_path.startswith(asset_root + os.sep):
        return None
    if not os.path.isfile(asset_path):
        return None

    content_type = mimetypes.guess_type(asset_path)[0] or "image/png"
    with open(asset_path, "rb") as file:
        return file.read(), content_type


def local_asset_url_to_data_url(image_url: str) -> str:
    """Inline a localhost ``/local-assets/`` URL as a base64 data URL.

    External URLs and existing data URLs are returned unchanged, as is any
    localhost URL that doesn't resolve to a real file under ``LOCAL_ASSET_DIR``.
    """
    read = local_asset_url_to_bytes(image_url)
    if read is None:
        return image_url
    data, content_type = read
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{content_type};base64,{encoded}"
