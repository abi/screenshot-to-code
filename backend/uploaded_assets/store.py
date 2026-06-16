import base64
import hashlib
import json
import os
import tempfile
from dataclasses import dataclass
from typing import Any, cast

import httpx
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles

from config import (
    BACKEND_SAAS_API_SECRET,
    BACKEND_SAAS_URL,
    IS_PROD,
    LOCAL_ASSET_DIR,
)


MAX_UPLOADED_ASSET_BYTES = 20 * 1024 * 1024
TEMP_ASSET_DIR = os.path.join(tempfile.gettempdir(), "screenshot-to-code-assets")
SUPPORTED_IMAGE_TYPES = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@dataclass(frozen=True)
class TemporaryAsset:
    asset_id: str
    content_type: str


@dataclass(frozen=True)
class SavedAsset:
    asset_id: str
    public_url: str
    content_type: str


def configure_uploaded_asset_routes(app: FastAPI) -> None:
    if IS_PROD:
        return

    os.makedirs(LOCAL_ASSET_DIR, exist_ok=True)
    app.mount("/local-assets", StaticFiles(directory=LOCAL_ASSET_DIR), name="local-assets")


def infer_local_asset_base_url(websocket: WebSocket) -> str:
    headers = getattr(websocket, "headers", {})
    forwarded_host = headers.get("x-forwarded-host")
    host = (forwarded_host or headers.get("host") or "").split(",", 1)[0]
    host = host.strip()

    websocket_url = getattr(websocket, "url", None)
    forwarded_proto = headers.get("x-forwarded-proto")
    raw_scheme = (
        forwarded_proto or getattr(websocket_url, "scheme", "")
    ).split(",", 1)[0].strip()
    scheme = "https" if raw_scheme == "wss" else "http" if raw_scheme == "ws" else raw_scheme

    if not host:
        host = getattr(websocket_url, "netloc", "")
    if not scheme:
        scheme = "http"

    return f"{scheme}://{host}"


def _asset_url(base_url: str, route: str, filename: str) -> str:
    return f"{base_url.rstrip('/')}/{route}/{filename}"


def _digest_for_bytes(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()[:24]


def _asset_id_for_digest(digest: str) -> str:
    return f"tmp_asset_{digest}"


def _digest_for_asset_id(asset_id: str) -> str | None:
    if not asset_id.startswith("tmp_asset_"):
        return None

    digest = asset_id.removeprefix("tmp_asset_")
    if len(digest) != 24 or not all(c in "0123456789abcdef" for c in digest):
        return None

    return digest


def _content_type_for_extension(extension: str) -> str:
    return next(
        (
            candidate_type
            for candidate_type, candidate_extension in SUPPORTED_IMAGE_TYPES.items()
            if candidate_extension == extension
        ),
        "application/octet-stream",
    )


def _metadata_path(asset_id: str) -> str:
    return os.path.join(TEMP_ASSET_DIR, f"{asset_id}.json")


def _write_metadata(asset_id: str, content_type: str, asset_base_url: str) -> None:
    with open(_metadata_path(asset_id), "w") as file:
        json.dump(
            {
                "asset_id": asset_id,
                "content_type": content_type,
                "asset_base_url": asset_base_url,
            },
            file,
        )


def _read_metadata(asset_id: str) -> dict[str, str] | None:
    try:
        with open(_metadata_path(asset_id), "r") as file:
            raw_metadata: Any = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

    if not isinstance(raw_metadata, dict):
        return None

    typed_metadata = cast(dict[str, object], raw_metadata)
    metadata: dict[str, str] = {}
    for key in ("content_type", "asset_base_url"):
        value = typed_metadata.get(key)
        if isinstance(value, str):
            metadata[key] = value
    return metadata


def _temporary_asset_path(asset_id: str) -> tuple[str, str, str, str] | None:
    if not _digest_for_asset_id(asset_id):
        return None

    metadata = _read_metadata(asset_id)
    if not metadata:
        return None

    for extension in SUPPORTED_IMAGE_TYPES.values():
        filename = f"{asset_id}{extension}"
        filepath = os.path.join(TEMP_ASSET_DIR, filename)
        if os.path.isfile(filepath):
            return (
                filepath,
                filename,
                metadata.get("content_type") or _content_type_for_extension(extension),
                metadata.get("asset_base_url") or "",
            )
    return None


def _decode_image_data_url(data_url: str) -> tuple[bytes, str, str] | None:
    """Decode a ``data:image/*`` URL into ``(bytes, content_type, extension)``.

    Returns ``None`` for non-image data URLs, unsupported image types,
    undecodable base64, or payloads over ``MAX_UPLOADED_ASSET_BYTES``.
    """
    if not data_url.startswith("data:image/") or "," not in data_url:
        return None

    header, encoded = data_url.split(",", 1)
    content_type = header.removeprefix("data:").split(";", 1)[0].lower()
    extension = SUPPORTED_IMAGE_TYPES.get(content_type)
    if not extension:
        return None

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except ValueError:
        return None

    if len(image_bytes) > MAX_UPLOADED_ASSET_BYTES:
        return None

    return image_bytes, content_type, extension


def _finalize_asset_bytes(
    image_bytes: bytes,
    extension: str,
    content_type: str,
    asset_base_url: str,
    user_id: str | None,
) -> SavedAsset:
    """Write asset bytes to the served ``LOCAL_ASSET_DIR`` and return a SavedAsset.

    The single "finalize" step that turns bytes into a durable, served asset.
    Content-addressed by digest, so identical bytes dedupe to one file.
    ``user_id`` is unused locally but is the hook hosted backends key durable
    per-user storage off of.
    """
    _ = user_id
    digest = _digest_for_bytes(image_bytes)
    asset_id = _asset_id_for_digest(digest)
    permanent_filename = f"asset_{digest}{extension}"

    os.makedirs(LOCAL_ASSET_DIR, exist_ok=True)
    destination_path = os.path.join(LOCAL_ASSET_DIR, permanent_filename)
    if not os.path.exists(destination_path):
        with open(destination_path, "wb") as file:
            file.write(image_bytes)

    return SavedAsset(
        asset_id=asset_id,
        public_url=_asset_url(asset_base_url, "local-assets", permanent_filename),
        content_type=content_type,
    )


def persist_data_url_as_temporary_asset(
    data_url: str,
    asset_base_url: str,
) -> TemporaryAsset | None:
    """Stage an uploaded data URL as a temporary asset, pending a later promote.

    Used for user uploads, where only some images turn out to be assets the
    model keeps (via ``save_assets``); the rest stay reference-only. Callers
    that already know the image is an asset should use
    ``persist_data_url_as_asset`` instead and skip this staging hop.
    """
    decoded = _decode_image_data_url(data_url)
    if decoded is None:
        return None
    image_bytes, content_type, extension = decoded

    os.makedirs(TEMP_ASSET_DIR, exist_ok=True)
    digest = _digest_for_bytes(image_bytes)
    asset_id = _asset_id_for_digest(digest)
    filename = f"{asset_id}{extension}"
    filepath = os.path.join(TEMP_ASSET_DIR, filename)
    if not os.path.exists(filepath):
        with open(filepath, "wb") as file:
            file.write(image_bytes)
    _write_metadata(asset_id, content_type, asset_base_url)

    return TemporaryAsset(
        asset_id=asset_id,
        content_type=content_type,
    )


def _temporary_asset_data_url(filepath: str, content_type: str) -> str:
    with open(filepath, "rb") as file:
        encoded = base64.b64encode(file.read()).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


async def _promote_temporary_asset_with_saas(
    source_path: str,
    content_type: str,
    user_id: str | None,
) -> SavedAsset | None:
    if not BACKEND_SAAS_URL or not BACKEND_SAAS_API_SECRET:
        return None

    data_url = _temporary_asset_data_url(source_path, content_type)
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BACKEND_SAAS_URL}/assets/store_image_data",
            json={
                "data_url": data_url,
                "source_type": "user_upload",
                "user_id": user_id,
            },
            headers={"Authorization": f"Bearer {BACKEND_SAAS_API_SECRET}"},
            timeout=45,
        )
        response.raise_for_status()
        response_data = response.json()

    public_url = response_data.get("public_url")
    asset_id = response_data.get("asset_id")
    if not isinstance(public_url, str) or not public_url:
        return None
    if not isinstance(asset_id, str) or not asset_id:
        return None

    return SavedAsset(
        asset_id=asset_id,
        public_url=public_url,
        content_type=content_type,
    )


async def persist_data_url_as_asset(
    data_url: str,
    asset_base_url: str,
    user_id: str | None = None,
) -> SavedAsset | None:
    """Persist a data URL straight to a durable, served asset.

    Skips the temp-staging hop used for uploads: callers that already know the
    image is an asset (e.g. ``extract_assets``) commit immediately. Async to
    match ``promote_temporary_asset_id`` so hosted backends can finalize to
    remote storage without changing callers.

    TODO(hosted): add an ``if IS_PROD`` branch that POSTs ``data_url`` to the
    SaaS (like ``_promote_temporary_asset_with_saas``) so extracted crops are
    stored in S3 rather than local disk.
    """
    decoded = _decode_image_data_url(data_url)
    if decoded is None:
        return None
    image_bytes, content_type, extension = decoded
    return _finalize_asset_bytes(
        image_bytes, extension, content_type, asset_base_url, user_id
    )


async def promote_temporary_asset_id(
    asset_id: str,
    user_id: str | None = None,
) -> SavedAsset | None:
    """Finalize a previously-staged temporary asset into a served asset."""
    temporary_asset = _temporary_asset_path(asset_id)
    if not temporary_asset:
        return None

    source_path, temporary_filename, content_type, asset_base_url = temporary_asset
    if IS_PROD:
        return await _promote_temporary_asset_with_saas(
            source_path,
            content_type,
            user_id,
        )

    _, extension = os.path.splitext(temporary_filename)
    with open(source_path, "rb") as file:
        image_bytes = file.read()
    return _finalize_asset_bytes(
        image_bytes, extension, content_type, asset_base_url, user_id
    )
