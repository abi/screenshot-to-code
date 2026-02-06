import pytest

from image_generation import replicate


def test_extract_output_url_from_string() -> None:
    assert (
        replicate._extract_output_url("https://example.com/image.png", "test")
        == "https://example.com/image.png"
    )


def test_extract_output_url_from_dict() -> None:
    assert (
        replicate._extract_output_url({"url": "https://example.com/image.png"}, "test")
        == "https://example.com/image.png"
    )


def test_extract_output_url_from_list() -> None:
    assert (
        replicate._extract_output_url(["https://example.com/image.png"], "test")
        == "https://example.com/image.png"
    )


def test_extract_output_url_from_list_item_dict() -> None:
    assert (
        replicate._extract_output_url(
            [{"url": "https://example.com/image.png"}], "test"
        )
        == "https://example.com/image.png"
    )


def test_extract_output_url_invalid_raises() -> None:
    with pytest.raises(ValueError):
        replicate._extract_output_url([], "test")


@pytest.mark.asyncio
async def test_call_replicate_uses_flux_model(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    async def fake_call_replicate_model(
        model_path: str, input: dict[str, object], api_token: str
    ) -> list[str]:
        captured["model_path"] = model_path
        captured["input"] = input
        captured["api_token"] = api_token
        return ["https://example.com/flux.png"]

    monkeypatch.setattr(replicate, "call_replicate_model", fake_call_replicate_model)

    result = await replicate.call_replicate({"prompt": "test", "seed": 1}, "token-123")

    assert result == "https://example.com/flux.png"
    assert captured["model_path"] == replicate.FLUX_MODEL_PATH
    assert captured["api_token"] == "token-123"


@pytest.mark.asyncio
async def test_remove_background_uses_version_and_normalizes_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    async def fake_call_replicate_version(
        version: str, input: dict[str, object], api_token: str
    ) -> dict[str, str]:
        captured["version"] = version
        captured["input"] = input
        captured["api_token"] = api_token
        return {"url": "https://example.com/no-bg.png"}

    monkeypatch.setattr(replicate, "call_replicate_version", fake_call_replicate_version)

    result = await replicate.remove_background("https://example.com/input.png", "token")

    assert result == "https://example.com/no-bg.png"
    assert captured["version"] == replicate.REMOVE_BACKGROUND_VERSION
    assert captured["api_token"] == "token"
