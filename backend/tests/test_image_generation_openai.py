from types import SimpleNamespace
from typing import Any

import pytest

from image_generation import generation


class FakeImages:
    def __init__(self) -> None:
        self.kwargs: dict[str, Any] = {}

    async def generate(self, **kwargs: Any) -> Any:
        self.kwargs = kwargs
        return SimpleNamespace(
            data=[SimpleNamespace(url=None, b64_json="aW1hZ2UtYnl0ZXM=")]
        )


class FakeOpenAIClient:
    last_client: "FakeOpenAIClient | None" = None

    def __init__(self, api_key: str, base_url: str | None) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.images = FakeImages()
        self.closed = False
        FakeOpenAIClient.last_client = self

    async def close(self) -> None:
        self.closed = True


@pytest.mark.asyncio
async def test_generate_image_openai_uses_gpt_image_2_and_returns_data_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(generation, "AsyncOpenAI", FakeOpenAIClient)

    result = await generation.generate_image_openai(
        "a clean product hero", "sk-test", "https://proxy.example/v1"
    )

    client = FakeOpenAIClient.last_client
    assert client is not None
    assert result == "data:image/png;base64,aW1hZ2UtYnl0ZXM="
    assert client.closed is True
    assert client.api_key == "sk-test"
    assert client.base_url == "https://proxy.example/v1"
    assert client.images.kwargs == {
        "model": "gpt-image-2",
        "quality": "medium",
        "output_format": "png",
        "n": 1,
        "size": "1024x1024",
        "prompt": "a clean product hero",
    }


@pytest.mark.asyncio
async def test_generate_image_openai_preserves_url_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UrlImages(FakeImages):
        async def generate(self, **kwargs: Any) -> Any:
            self.kwargs = kwargs
            return SimpleNamespace(
                data=[SimpleNamespace(url="https://example.com/image.png", b64_json=None)]
            )

    class UrlOpenAIClient(FakeOpenAIClient):
        def __init__(self, api_key: str, base_url: str | None) -> None:
            super().__init__(api_key, base_url)
            self.images = UrlImages()

    monkeypatch.setattr(generation, "AsyncOpenAI", UrlOpenAIClient)

    result = await generation.generate_image_openai("a logo", "sk-test", None)

    assert result == "https://example.com/image.png"
