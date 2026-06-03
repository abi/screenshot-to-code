import base64
from pathlib import Path

import pytest

from uploaded_assets import (
    append_uploaded_asset_ids_to_prompt,
    persist_data_url_as_temporary_asset,
    promote_temporary_asset_id,
)


def _data_url(payload: bytes, content_type: str = "image/png") -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def test_persist_data_url_as_temporary_asset_writes_tmp_file_and_returns_asset_id(
    monkeypatch,
    tmp_path: Path,
) -> None:
    temp_dir = tmp_path / "tmp-assets"
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(temp_dir))

    asset = persist_data_url_as_temporary_asset(
        _data_url(b"image-bytes"),
        "http://127.0.0.1:7001",
    )

    assert asset is not None
    assert asset.asset_id.startswith("tmp_asset_")
    assert "/" not in asset.asset_id
    assert asset.content_type == "image/png"
    assert len(list(temp_dir.iterdir())) == 2


@pytest.mark.asyncio
async def test_promote_temporary_asset_id_returns_permanent_url(
    monkeypatch,
    tmp_path: Path,
) -> None:
    temp_dir = tmp_path / "tmp-assets"
    asset_dir = tmp_path / "local-assets"
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(temp_dir))
    monkeypatch.setattr("uploaded_assets.store.LOCAL_ASSET_DIR", str(asset_dir))

    temp_asset = persist_data_url_as_temporary_asset(
        _data_url(b"image-bytes"),
        "http://127.0.0.1:7001",
    )
    assert temp_asset is not None

    permanent_asset = await promote_temporary_asset_id(temp_asset.asset_id)

    assert permanent_asset is not None
    assert permanent_asset.asset_id == temp_asset.asset_id
    assert permanent_asset.public_url.startswith(
        "http://127.0.0.1:7001/local-assets/"
    )
    assert temp_asset.asset_id not in permanent_asset.public_url
    assert len(list(asset_dir.iterdir())) == 1


@pytest.mark.asyncio
async def test_promote_temporary_asset_id_posts_to_saas_in_prod(
    monkeypatch,
    tmp_path: Path,
) -> None:
    temp_dir = tmp_path / "tmp-assets"
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(temp_dir))
    monkeypatch.setattr("uploaded_assets.store.IS_PROD", True)
    monkeypatch.setattr("uploaded_assets.store.BACKEND_SAAS_URL", "https://saas.test")
    monkeypatch.setattr("uploaded_assets.store.BACKEND_SAAS_API_SECRET", "secret")

    captured: dict[str, object] = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {
                "asset_id": "asset-1",
                "public_url": "https://cdn.example.com/random.png",
            }

    class FakeAsyncClient:
        async def __aenter__(self) -> "FakeAsyncClient":
            return self

        async def __aexit__(self, exc_type, exc, traceback) -> None:
            return None

        async def post(self, url: str, **kwargs) -> FakeResponse:
            captured["url"] = url
            captured["kwargs"] = kwargs
            return FakeResponse()

    monkeypatch.setattr("uploaded_assets.store.httpx.AsyncClient", FakeAsyncClient)

    temp_asset = persist_data_url_as_temporary_asset(
        _data_url(b"image-bytes"),
        "http://127.0.0.1:7001",
    )
    assert temp_asset is not None

    permanent_asset = await promote_temporary_asset_id(
        temp_asset.asset_id,
        user_id="user-1",
    )

    assert permanent_asset is not None
    assert permanent_asset.asset_id == "asset-1"
    assert permanent_asset.public_url == "https://cdn.example.com/random.png"
    assert permanent_asset.content_type == "image/png"
    assert captured["url"] == "https://saas.test/assets/store_image_data"
    kwargs = captured["kwargs"]
    assert isinstance(kwargs, dict)
    assert kwargs["headers"] == {"Authorization": "Bearer secret"}
    assert kwargs["json"] == {
        "data_url": _data_url(b"image-bytes"),
        "source_type": "user_upload",
        "user_id": "user-1",
    }


def test_append_uploaded_asset_ids_to_prompt_keeps_image_and_adds_id(
    monkeypatch,
    tmp_path: Path,
) -> None:
    image = _data_url(b"asset-image")
    monkeypatch.setattr("uploaded_assets.store.TEMP_ASSET_DIR", str(tmp_path))

    prompt = append_uploaded_asset_ids_to_prompt(
        {"text": "Build a shop", "images": [image], "videos": []},
        "http://127.0.0.1:7001",
    )

    assert prompt["images"] == [image]
    assert "Uploaded image asset IDs" in prompt["text"]
    assert "asset_id `tmp_asset_" in prompt["text"]
    assert "tmp-assets" not in prompt["text"]
    assert "http://127.0.0.1:7001" not in prompt["text"]
    assert "save_assets" in prompt["text"]
    assert "asset_ids list" in prompt["text"]
    assert "Decide" in prompt["text"]
