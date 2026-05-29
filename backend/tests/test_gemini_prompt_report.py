from types import SimpleNamespace
from pathlib import Path
from typing import Any, cast

from google.genai import types

from fs_logging.gemini_prompt_report import write_gemini_prompt_report
from llm import Llm


GEMINI_3_5_FLASH_LOW = cast(
    Llm,
    SimpleNamespace(value="gemini-3.5-flash (low thinking)"),
)


def test_gemini_prompt_report_writes_html_file_for_3_5_flash(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    filepath = write_gemini_prompt_report(
        model=GEMINI_3_5_FLASH_LOW,
        api_model_name="gemini-3.5-flash",
        thinking_level="low",
        system_instruction="System prompt",
        contents=[
            types.Content(
                role="user",
                parts=[types.Part(text="Build the screenshot exactly.")],
            )
        ],
        config=types.GenerateContentConfig(
            temperature=1.0,
            thinking_config=types.ThinkingConfig(
                thinking_level=cast(Any, "low"),
                include_thoughts=True,
            ),
        ),
    )

    assert filepath is not None
    assert filepath.startswith(str(tmp_path / "run_logs"))
    assert Path(filepath).name.startswith("gemini_prompt_report_gemini-3.5-flash_")
    assert filepath.endswith(".html")
    html = Path(filepath).read_text(encoding="utf-8")
    assert "Gemini 3.5 Flash Prompt Report" in html
    assert "thinking_level=low" in html
    assert "System prompt" in html
    assert "Build the screenshot exactly." in html


def test_gemini_prompt_report_skips_non_3_5_flash(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    filepath = write_gemini_prompt_report(
        model=Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
        api_model_name="gemini-3-flash-preview",
        thinking_level="low",
        system_instruction="System prompt",
        contents=[],
        config={},
    )

    assert filepath is None
    assert not list(tmp_path.rglob("*.html"))
