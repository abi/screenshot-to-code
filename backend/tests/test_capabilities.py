import pytest

import preview_screenshot
from routes.home import get_capabilities


@pytest.mark.asyncio
async def test_capabilities_reports_screenshot_preview_available(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_probe() -> bool:
        return True

    monkeypatch.setattr(preview_screenshot, "probe_screenshot_preview", fake_probe)
    monkeypatch.setattr("routes.home.probe_screenshot_preview", fake_probe)

    result = await get_capabilities()
    assert result.screenshot_preview is True


@pytest.mark.asyncio
async def test_capabilities_reports_screenshot_preview_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_probe() -> bool:
        return False

    monkeypatch.setattr("routes.home.probe_screenshot_preview", fake_probe)

    result = await get_capabilities()
    assert result.screenshot_preview is False
