import base64
from pathlib import Path

import pytest

from agent.tools.local_assets import local_asset_url_to_data_url


def test_converts_localhost_asset_to_data_url(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    (tmp_path / "logo.png").write_bytes(b"image-bytes")

    result = local_asset_url_to_data_url(
        "http://127.0.0.1:7001/local-assets/logo.png"
    )

    expected = base64.b64encode(b"image-bytes").decode()
    assert result == f"data:image/png;base64,{expected}"


def test_passes_through_external_urls(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    external = "https://replicate.delivery/abc/logo.png"
    assert local_asset_url_to_data_url(external) == external


def test_passes_through_existing_data_urls(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    data_url = "data:image/png;base64,aW1hZ2U="
    assert local_asset_url_to_data_url(data_url) == data_url


def test_missing_file_is_left_unchanged(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    url = "http://localhost:7001/local-assets/does-not-exist.png"
    assert local_asset_url_to_data_url(url) == url


def test_path_traversal_is_refused(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr("agent.tools.local_assets.LOCAL_ASSET_DIR", str(tmp_path))
    url = "http://127.0.0.1:7001/local-assets/../../etc/passwd"
    # Escapes the asset root → returned unchanged, never read from disk.
    assert local_asset_url_to_data_url(url) == url
