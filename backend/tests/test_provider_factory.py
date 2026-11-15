from typing import Any

import pytest

from agent.providers.factory import create_provider_session
from llm import Llm
from openai_compat import OPENROUTER_API_BASE_URL, OPENROUTER_HTTP_REFERER


def test_factory_normalizes_openrouter_url_and_adds_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    class FakeClient:
        def __init__(self, **kwargs: Any) -> None:
            captured.update(kwargs)

    monkeypatch.setattr("agent.providers.factory.AsyncOpenAI", FakeClient)
    monkeypatch.setattr(
        "agent.providers.factory.is_screenshot_preview_available",
        lambda: False,
    )

    create_provider_session(
        model=Llm.GPT_5_5_HIGH,
        prompt_messages=[],
        should_generate_images=False,
        openai_api_key="or-key",
        openai_base_url="https://openrouter.ai",
        anthropic_api_key=None,
        gemini_api_key=None,
        replicate_api_key=None,
        should_extract_assets=False,
    )

    assert captured["api_key"] == "or-key"
    assert captured["base_url"] == OPENROUTER_API_BASE_URL
    assert captured["default_headers"]["HTTP-Referer"] == OPENROUTER_HTTP_REFERER


def test_factory_skips_headers_for_official_openai(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    class FakeClient:
        def __init__(self, **kwargs: Any) -> None:
            captured.update(kwargs)

    monkeypatch.setattr("agent.providers.factory.AsyncOpenAI", FakeClient)
    monkeypatch.setattr(
        "agent.providers.factory.is_screenshot_preview_available",
        lambda: False,
    )

    create_provider_session(
        model=Llm.GPT_5_5_HIGH,
        prompt_messages=[],
        should_generate_images=False,
        openai_api_key="sk-test",
        openai_base_url=None,
        anthropic_api_key=None,
        gemini_api_key=None,
        replicate_api_key=None,
        should_extract_assets=False,
    )

    assert captured["base_url"] is None
    assert captured["default_headers"] is None
