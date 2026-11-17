"""screenshot_preview actions: parsing, backend capability gating, and a
real-browser replay check (skipped when Chromium isn't installed)."""

from typing import Any

import pytest

import preview_screenshot.registry as registry
from agent.tools.definitions import canonical_tool_definitions
from agent.tools.screenshot_preview import MAX_ACTIONS, parse_actions
from preview_screenshot import PlaywrightBackend, PreviewAction


def test_parse_actions_accepts_none_and_normalizes_values() -> None:
    assert parse_actions(None) == []
    assert parse_actions([{"type": "scroll", "value": 600}]) == [
        {"type": "scroll", "target": None, "value": "600"}
    ]


@pytest.mark.parametrize(
    "raw, message",
    [
        ("click", "must be a list"),
        (["click"], "must be an object"),
        ([{"type": "drag"}], "unknown type"),
        ([{"type": "click", "target": "x"}] * (MAX_ACTIONS + 1), "at most"),
        ([{"type": "screenshot"}] * 5, "screenshot actions"),
    ],
)
def test_parse_actions_rejects_bad_input(raw: Any, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        parse_actions(raw)


class CaptureOnlyBackend:
    """Like an external screenshot API: renders HTML but can't replay actions."""

    async def capture(self, html: str, device: str, full_page: bool) -> bytes:
        return f"{device}-png".encode()

    async def available(self) -> bool:
        return True


def test_actions_are_only_offered_when_the_backend_can_replay_them() -> None:
    def screenshot_tool(actions_enabled: bool):
        tools = canonical_tool_definitions(True, screenshot_actions_enabled=actions_enabled)
        return next(tool for tool in tools if tool.name == "screenshot_preview")

    assert "actions" in screenshot_tool(True).parameters["properties"]
    plain = screenshot_tool(False)
    assert plain.parameters["properties"] == {}
    assert "actions" not in plain.description


@pytest.mark.asyncio
async def test_capture_only_backend_serves_plain_previews(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(registry, "_backend", CaptureOnlyBackend())
    assert registry.supports_preview_actions() is False

    rendered = await registry.render_preview("<p>hi</p>", "mobile", True)
    assert [(shot.label, shot.png) for shot in rendered.shots] == [("initial", b"mobile-png")]

    actions: list[PreviewAction] = [{"type": "click", "target": "x"}]
    with pytest.raises(RuntimeError, match="cannot replay actions"):
        await registry.render_preview("<p>hi</p>", "desktop", False, actions)


PAGE = """<!DOCTYPE html><html><head><title>Home</title></head><body>
<a id="ok" href="#" onclick="event.preventDefault();document.title='History';
  history.pushState({}, '', '#history');
  document.getElementById('view').textContent='Revision history'">View history</a>
<select id="kind"><option>All</option><option>Scenery</option></select>
<input placeholder="Search" oninput="document.getElementById('view').textContent='typed '+this.value">
<button onclick="undefinedFunction()">Crash</button>
<button onclick="history.pushState({}, '', '/wiki/Other')">Push path</button>
<p id="view">Home</p>
</body></html>"""


async def _render(actions: list[Any]):
    backend = PlaywrightBackend()
    if not await backend.available():
        pytest.skip("Chromium is not installed")
    return await backend.render(PAGE, "desktop", False, parse_actions(actions))


@pytest.mark.asyncio
async def test_render_replays_actions_and_reports_state() -> None:
    rendered = await _render(
        [
            {"type": "type", "target": "Search", "value": "abc"},
            {"type": "select", "target": "#kind", "value": "Scenery"},
            {"type": "screenshot", "value": "typed"},
            {"type": "click", "target": "View history"},
        ]
    )
    assert [shot.label for shot in rendered.shots] == ["typed", "after actions"]
    assert rendered.action_log[0].startswith('1. type: typed "abc"')
    assert 'selected "Scenery"' in rendered.action_log[1]
    assert rendered.title == "History"
    assert rendered.url.endswith("#history")
    assert rendered.errors == []


@pytest.mark.asyncio
async def test_render_surfaces_failures_and_script_errors() -> None:
    rendered = await _render(
        [
            {"type": "click", "target": "Crash"},
            {"type": "click", "target": "Push path"},
            {"type": "click", "target": "No such button"},
            {"type": "click", "target": "View history"},
        ]
    )
    assert any("undefinedFunction" in error for error in rendered.errors)
    # As in the app's srcdoc preview, pushState can't leave the document's URL.
    assert any("pushState" in error for error in rendered.errors)
    assert "FAILED" in rendered.action_log[2]
    assert rendered.action_log[3].startswith("Stopped")
    assert rendered.title == "Home"
