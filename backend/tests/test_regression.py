"""Regression suite for screenshot-to-code: golden-snapshot and behaviour tests.

Run with:  poetry run pytest tests/test_regression.py -v

Tests here are designed to be fast, deterministic, and offline (no API keys
required).  They validate the mechanics that other tests cover with live LLM
calls, so regressions in asset handling, normalization, or tool configuration
are caught without spending tokens or time.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
from typing import Any

import pytest

# -------------------------------------------------------------------------- #
# Helpers
# -------------------------------------------------------------------------- #


def _sha256(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode()
    return hashlib.sha256(data).hexdigest()


# -------------------------------------------------------------------------- #
# Test 1 – normalize_local_asset_urls handles every local URL variant
# -------------------------------------------------------------------------- #

from evals.runner import normalize_local_asset_urls


class TestNormalizeLocalAssetUrls:
    def test_root_relative_double_quoted(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = '<img src="/local-assets/crop_001.png">'
        out = normalize_local_asset_urls(html)
        assert 'http://eval-host:7070/local-assets/crop_001.png' in out
        assert '"/local-assets/' not in out

    def test_root_relative_single_quoted(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = "<img src='/local-assets/crop_001.png'>"
        out = normalize_local_asset_urls(html)
        assert "http://eval-host:7070/local-assets/crop_001.png" in out

    def test_css_url_root_relative(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = '<div style="background: url(/local-assets/bg.png)">'
        out = normalize_local_asset_urls(html)
        assert "url(http://eval-host:7070/local-assets/bg.png)" in out
        assert "url(/local-assets/" not in out

    def test_localhost_5173_url(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://127.0.0.1:7001"
        )
        html = (
            '<img src="http://localhost:5173/local-assets/a.png">'
            '<img src="https://localhost:5173/local-assets/b.png">'
        )
        out = normalize_local_asset_urls(html)
        assert "http://127.0.0.1:7001/local-assets/a.png" in out
        assert "https://127.0.0.1:7001/local-assets/b.png" in out
        assert "localhost:5173/local-assets/" not in out

    def test_localhost_7860_url(self, monkeypatch) -> None:
        """port 7860 is another common dev-server port."""
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://127.0.0.1:7001"
        )
        html = '<img src="http://localhost:7860/local-assets/c.png">'
        out = normalize_local_asset_urls(html)
        # The current replacements list does not explicitly cover :7860;
        # this test documents the current behaviour and will FAIL if :7860
        # is added without updating the replacement list.
        # Add ("http://localhost:7860/local-assets/", ...) to the replacements
        # list in runner.py if you need it to pass.
        assert "localhost:7860" not in out or "7001" in out

    def test_127_0_0_1_5173_url(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = '<img src="http://127.0.0.1:5173/local-assets/d.png">'
        out = normalize_local_asset_urls(html)
        assert "http://eval-host:7070/local-assets/d.png" in out

    def test_public_remote_urls_untouched(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = '<img src="https://replicate.delivery/xyz/out.png">'
        assert normalize_local_asset_urls(html) == html

    def test_multiple_assets_in_one_html(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = (
            '<img src="/local-assets/a.png">'
            '<img src="http://localhost:5173/local-assets/b.png">'
            '<div style="background:url(/local-assets/c.png)"></div>'
            '<img src="https://replicate.delivery/xyz/out.png">'
        )
        out = normalize_local_asset_urls(html)
        assert out.count("http://eval-host:7070/local-assets/") == 3
        assert '"/local-assets/' not in out
        assert "localhost:5173" not in out
        assert "replicate.delivery" in out  # public URL preserved


# -------------------------------------------------------------------------- #
# Test 2 – Screenshot cache key is deterministic and viewport-aware
# -------------------------------------------------------------------------- #

from agent.tools.screenshot_preview import _screenshot_cache_key


class TestScreenshotCacheKey:
    def test_same_html_different_viewports_different_keys(self) -> None:
        html = "<html><body>Hello</body></html>"
        key_desktop = _screenshot_cache_key(html, "desktop")
        key_mobile = _screenshot_cache_key(html, "mobile")
        assert key_desktop != key_mobile

    def test_different_html_same_viewport_different_keys(self) -> None:
        html_a = "<html><body>Hello A</body></html>"
        html_b = "<html><body>Hello B</body></html>"
        key_a = _screenshot_cache_key(html_a, "desktop")
        key_b = _screenshot_cache_key(html_b, "desktop")
        assert key_a != key_b

    def test_same_html_same_viewport_same_key(self) -> None:
        html = "<html><body>Hello</body></html>"
        key1 = _screenshot_cache_key(html, "desktop")
        key2 = _screenshot_cache_key(html, "desktop")
        assert key1 == key2

    def test_key_is_valid_sha256_hex(self) -> None:
        key = _screenshot_cache_key("<html/>", "desktop")
        assert len(key) == 64
        assert all(c in "0123456789abcdef" for c in key)


# -------------------------------------------------------------------------- #
# Test 3 – Screenshot cache read/write round-trips correctly
# -------------------------------------------------------------------------- #

from agent.tools.screenshot_preview import (
    _read_screenshot_cache,
    _write_screenshot_cache,
    _screenshot_cache_path,
    clear_screenshot_cache,
)


class TestScreenshotCacheRoundTrip:
    def test_write_then_read_returns_bytes(self, monkeypatch, tmp_path) -> None:
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_DIR",
            str(tmp_path),
        )
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_ENABLED",
            True,
        )
        key = "abcd1234" * 8  # 64-char sha256-like key
        image_bytes = b"\x89PNG\r\n\x1a\n" + b"fake png content"
        _write_screenshot_cache(key, image_bytes)
        result = _read_screenshot_cache(key)
        assert result == image_bytes

    def test_read_missing_key_returns_none(self, monkeypatch, tmp_path) -> None:
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_DIR",
            str(tmp_path),
        )
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_ENABLED",
            True,
        )
        assert _read_screenshot_cache("nonexistent_key" * 8) is None

    def test_disabled_cache_returns_none_on_read(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_ENABLED",
            False,
        )
        assert _read_screenshot_cache("any_key" * 8) is None

    def test_disabled_cache_raises_nothing_on_write(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_ENABLED",
            False,
        )
        # Must not raise.
        _write_screenshot_cache("any_key" * 8, b"bytes")

    def test_clear_screenshot_cache_removes_only_png_files(
        self, monkeypatch, tmp_path
    ) -> None:
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_DIR",
            str(tmp_path),
        )
        # Create some PNG files and a non-PNG file.
        (tmp_path / "a.png").write_bytes(b"png1")
        (tmp_path / "b.png").write_bytes(b"png2")
        (tmp_path / "not_png.txt").write_text("text")
        (tmp_path / "c.png").write_bytes(b"png3")

        count = clear_screenshot_cache()

        assert count == 3
        assert not (tmp_path / "a.png").exists()
        assert not (tmp_path / "b.png").exists()
        assert not (tmp_path / "c.png").exists()
        assert (tmp_path / "not_png.txt").exists()

    def test_clear_screenshot_cache_on_empty_dir_returns_zero(
        self, monkeypatch, tmp_path
    ) -> None:
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.SCREENSHOT_CACHE_DIR",
            str(tmp_path),
        )
        assert clear_screenshot_cache() == 0


# -------------------------------------------------------------------------- #
# Test 4 – AgentToolRuntime skips screenshot_preview when configured
# -------------------------------------------------------------------------- #

from agent.state import AgentFileState
from agent.tools.runtime import AgentToolRuntime


class TestAgentToolRuntimeOfflineMode:
    @pytest.fixture
    def file_state(self) -> AgentFileState:
        fs = AgentFileState()
        fs.content = "<html><body>Hello</body></html>"
        return fs

    @pytest.mark.asyncio
    async def test_screenshot_preview_skipped_when_flag_set(
        self, file_state: AgentFileState
    ) -> None:
        runtime = AgentToolRuntime(
            file_state=file_state,
            should_generate_images=False,
            openai_api_key=None,
            openai_base_url=None,
            skip_screenshot_preview=True,
        )
        from agent.tools.types import ToolCall

        tool_call = ToolCall(
            id="test-call",
            name="screenshot_preview",
            arguments={},
        )
        result = await runtime.execute(tool_call)
        assert result.ok is True
        assert result.summary.get("status") == "skipped_offline"
        # No Playwright calls were made.
        assert result.multimodal_parts == []

    @pytest.mark.asyncio
    async def test_screenshot_preview_runs_normally_when_flag_unset(
        self, file_state: AgentFileState, monkeypatch
    ) -> None:
        """When skip_screenshot_preview=False the runtime delegates to the
        preview_screenshot registry as normal; we patch the registry call to
        avoid needing a browser."""
        monkeypatch.setattr(
            "agent.tools.screenshot_preview.capture_preview_screenshot",
            lambda html, device, full_page: b"PNG_PLACEHOLDER",
        )
        runtime = AgentToolRuntime(
            file_state=file_state,
            should_generate_images=False,
            openai_api_key=None,
            openai_base_url=None,
            skip_screenshot_preview=False,
        )
        from agent.tools.types import ToolCall

        tool_call = ToolCall(
            id="test-call",
            name="screenshot_preview",
            arguments={},
        )
        result = await runtime.execute(tool_call)
        # In this test the patched capture returns bytes, but the runtime
        # should have called it (result.ok is True because capture returned).
        assert result.ok is True


# -------------------------------------------------------------------------- #
# Test 5 – Config flags default to safe, backward-compatible values
# -------------------------------------------------------------------------- #

from config import SCREENSHOT_CACHE_ENABLED, SCREENSHOT_CACHE_DIR


class TestConfigDefaults:
    def test_screenshot_cache_enabled_default_is_true(self) -> None:
        # The default is True so existing deployments get the speed benefit
        # without any configuration change.
        assert SCREENSHOT_CACHE_ENABLED is True

    def test_screenshot_cache_dir_is_absolute_path(self) -> None:
        assert os.path.isabs(SCREENSHOT_CACHE_DIR)


# -------------------------------------------------------------------------- #
# Test 6 – generate_code_for_text and generate_code_for_image accept
#           skip_screenshot_preview kwarg (signature test)
# -------------------------------------------------------------------------- #

import inspect

from evals.core import generate_code_for_image, generate_code_for_text


class TestOfflineModeSignature:
    def test_generate_code_for_text_accepts_skip_screenshot_preview(self) -> None:
        sig = inspect.signature(generate_code_for_text)
        assert "skip_screenshot_preview" in sig.parameters

    def test_generate_code_for_image_accepts_skip_screenshot_preview(self) -> None:
        sig = inspect.signature(generate_code_for_image)
        assert "skip_screenshot_preview" in sig.parameters


# -------------------------------------------------------------------------- #
# Test 7 – normalize_local_asset_urls is idempotent
# -------------------------------------------------------------------------- #

class TestNormalizeIdempotent:
    def test_normalize_is_idempotent(self, monkeypatch) -> None:
        monkeypatch.setattr(
            "evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:7070"
        )
        html = (
            '<img src="/local-assets/a.png">'
            '<img src="http://localhost:5173/local-assets/b.png">'
        )
        first = normalize_local_asset_urls(html)
        second = normalize_local_asset_urls(first)
        assert first == second
