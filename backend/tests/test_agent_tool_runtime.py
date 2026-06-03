import asyncio
import base64
from pathlib import Path

import pytest

from agent.state import AgentFileState
from agent.tools.runtime import AgentToolRuntime
from agent.tools.types import ToolCall
from llm import Llm
from uploaded_assets import persist_data_url_as_temporary_asset


def _data_url(payload: bytes, content_type: str = "image/png") -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def test_edit_file_returns_structured_result_with_diff() -> None:
    runtime = AgentToolRuntime(
        file_state=AgentFileState(
            path="index.html",
            content="<div>before</div>\n<p>keep</p>\n",
        ),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = runtime._edit_file(
        {
            "old_text": "<div>before</div>",
            "new_text": "<div>after</div>",
        }
    )

    assert result.ok is True
    assert result.updated_content == "<div>after</div>\n<p>keep</p>\n"
    assert result.result["content"] == "Successfully edited file at index.html."
    assert set(result.result["details"].keys()) == {"diff", "firstChangedLine"}
    assert result.result["details"]["firstChangedLine"] == 1
    assert "--- index.html" in result.result["details"]["diff"]
    assert "+++ index.html" in result.result["details"]["diff"]
    assert "-<div>before</div>" in result.result["details"]["diff"]
    assert "+<div>after</div>" in result.result["details"]["diff"]
    assert result.summary["firstChangedLine"] == 1
    assert result.summary["diff"] == result.result["details"]["diff"]


@pytest.mark.asyncio
async def test_execute_edit_file_uses_updated_result_shape() -> None:
    runtime = AgentToolRuntime(
        file_state=AgentFileState(path="index.html", content="<main>old</main>"),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="edit_file",
            arguments={"old_text": "old", "new_text": "new"},
        )
    )

    # execute() is sync for edit_file and should preserve the structured payload.
    assert result.ok is True
    assert result.result["content"] == "Successfully edited file at index.html."
    assert set(result.result["details"].keys()) == {"diff", "firstChangedLine"}
    assert "--- index.html" in result.result["details"]["diff"]


@pytest.mark.asyncio
async def test_generate_images_returns_persisted_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_process_tasks(prompts, *_args):
        assert prompts == ["hero image", "logo image", "card image"]
        return [
            "https://replicate.delivery/tmp-1.png",
            "https://replicate.delivery/tmp-2.png",
            "https://replicate.delivery/tmp-3.png",
        ]

    concurrent = 0
    max_concurrent = 0

    async def fake_persist_asset_image_url(**kwargs):
        nonlocal concurrent, max_concurrent
        assert kwargs["source_type"] == "generated"
        assert kwargs["source_provider"] == "replicate"
        assert kwargs["generation_group_id"] == "group-1"
        assert kwargs["user_id"] == "user-1"
        assert kwargs["variant_index"] == 2
        concurrent += 1
        max_concurrent = max(max_concurrent, concurrent)
        await asyncio.sleep(0.01)
        concurrent -= 1
        return str(kwargs["source_url"]).replace(
            "https://replicate.delivery/tmp",
            "https://cdn.example.com/asset",
        )

    monkeypatch.setattr("agent.tools.runtime.REPLICATE_API_KEY", "replicate-key")
    monkeypatch.setattr("agent.tools.runtime.process_tasks", fake_process_tasks)
    monkeypatch.setattr(
        "agent.tools.runtime.persist_asset_image_url",
        fake_persist_asset_image_url,
    )

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=True,
        openai_api_key=None,
        openai_base_url=None,
        generation_group_id="group-1",
        user_id="user-1",
        variant_index=2,
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="generate_images",
            arguments={"prompts": ["hero image", "logo image", "card image"]},
        )
    )

    assert result.ok is True
    assert result.result["images"] == {
        "hero image": "https://cdn.example.com/asset-1.png",
        "logo image": "https://cdn.example.com/asset-2.png",
        "card image": "https://cdn.example.com/asset-3.png",
    }
    assert max_concurrent > 1


def test_create_file_reports_to_sentry_on_hosted_update(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: list[Exception] = []
    tags: dict[str, str] = {}
    extras: dict[str, object] = {}

    class _Scope:
        def __enter__(self) -> "_Scope":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def set_tag(self, key: object, value: object) -> None:
            tags[str(key)] = str(value)

        def set_extra(self, key: object, value: object) -> None:
            extras[str(key)] = value

    class _FakeSentry:
        @staticmethod
        def push_scope() -> _Scope:
            return _Scope()

        @staticmethod
        def capture_exception(error: Exception) -> None:
            captured.append(error)

    monkeypatch.setattr("agent.tools.runtime.IS_PROD", True)
    monkeypatch.setattr("agent.tools.runtime.sentry_sdk", _FakeSentry)

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
        generation_type="update",
        current_model=Llm.GPT_5_4_2026_03_05_LOW,
    )

    result = runtime._create_file(
        {"path": "index.html", "content": "<html>new</html>"}
    )

    assert result.ok is True
    assert len(captured) == 1
    assert str(captured[0]) == "create_file used outside create generation"
    assert tags["tool_name"] == "create_file"
    assert tags["generation_type"] == "update"
    assert tags["model"] == Llm.GPT_5_4_2026_03_05_LOW.value
    assert tags["model_api_name"] == "gpt-5.4-2026-03-05"
    assert extras["path"] == "index.html"


@pytest.mark.asyncio
async def test_save_assets_promotes_temporary_asset_id(
    monkeypatch: pytest.MonkeyPatch,
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

    runtime = AgentToolRuntime(
        file_state=AgentFileState(),
        should_generate_images=False,
        openai_api_key=None,
        openai_base_url=None,
    )

    result = await runtime.execute(
        ToolCall(
            id="call-1",
            name="save_assets",
            arguments={"asset_ids": [temp_asset.asset_id]},
        )
    )

    assert result.ok is True
    images = result.result["images"]
    assert len(images) == 1
    assert images[0]["asset_id"] == temp_asset.asset_id
    assert images[0]["status"] == "ok"
    assert images[0]["public_url"].startswith(
        "http://127.0.0.1:7001/local-assets/"
    )
    assert temp_asset.asset_id not in images[0]["public_url"]
    assert len(list(asset_dir.iterdir())) == 1
