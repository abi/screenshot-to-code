from pathlib import Path

from agent.providers.token_usage import TokenUsage
from fs_logging.openai_turn_inputs import OpenAITurnInputLogger
from llm import Llm


def test_openai_turn_input_logger_writes_html_report(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    logger = OpenAITurnInputLogger(model=Llm.GPT_5_2_CODEX_LOW, enabled=True)
    logger.record_turn_input(
        [
            {
                "role": "user",
                "content": "Build this page",
            },
            {
                "type": "function_call",
                "name": "read_file",
                "call_id": "call-1",
                "arguments": '{"path":"/tmp/example.txt"}',
            },
        ]
    )
    logger.record_turn_usage(
        TokenUsage(
            input=1200,
            output=300,
            cache_read=600,
            total=2100,
        )
    )

    report_path = logger.write_html_report()

    assert report_path is not None
    report = Path(report_path)
    assert report.exists()
    assert report.parent == tmp_path / "run_logs"

    html = report.read_text(encoding="utf-8")
    assert "OpenAI Turn Input Report" in html
    assert "Turn 1 (items=2)" in html
    assert "Build this page" in html
    assert "read_file" in html
    assert "Input tokens" in html
    assert "1200" in html
    assert "Cache hit rate" in html
    assert "33.33%" in html
    assert "Cost" in html
    assert "$" in html


def test_openai_turn_input_logger_preserves_full_large_payloads(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    logger = OpenAITurnInputLogger(model=Llm.GPT_5_3_CODEX_LOW, enabled=True)
    logger.record_turn_input(
        [
            {
                "role": "user",
                "content": [{"type": "input_text", "text": "BEGIN-" + ("x" * 450) + "-END"}],
            }
        ]
    )

    report_path = logger.write_html_report()

    assert report_path is not None
    html = Path(report_path).read_text(encoding="utf-8")
    assert "Usage unavailable for this turn." in html
    assert "Raw JSON payload" in html
    assert "string (460 chars)" in html
    assert "BEGIN-" in html
    assert "-END" in html
    assert "truncated 50 chars" not in html


def test_openai_turn_input_logger_includes_request_payload(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    logger = OpenAITurnInputLogger(model=Llm.GPT_5_2_CODEX_HIGH, enabled=True)
    logger.record_turn_input(
        [
            {
                "role": "user",
                "content": "Build this page",
            }
        ],
        request_payload={
            "model": "gpt-5.2-codex",
            "prompt_cache_key": "s2c-openai-session-v1-abc123",
            "input": [{"role": "user", "content": "Build this page"}],
        },
    )

    report_path = logger.write_html_report()

    assert report_path is not None
    html = Path(report_path).read_text(encoding="utf-8")
    assert "Request payload" in html
    assert "prompt_cache_key" in html
    assert "s2c-openai-session-v1-abc123" in html


def test_openai_turn_input_logger_disabled_writes_nothing(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    logger = OpenAITurnInputLogger(model=Llm.GPT_5_2_CODEX_LOW)
    logger.record_turn_input([{"role": "user", "content": "Build this page"}])
    logger.record_turn_usage(TokenUsage(input=100, output=50, total=150))

    report_path = logger.write_html_report()

    assert report_path is None
    assert not (tmp_path / "run_logs").exists()


def test_openai_turn_input_logger_summarizes_function_call_output(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.setenv("LOGS_PATH", str(tmp_path))

    logger = OpenAITurnInputLogger(model=Llm.GPT_5_2_CODEX_LOW, enabled=True)
    logger.record_turn_input(
        [
            {
                "type": "function_call_output",
                "call_id": "call-1",
                "output": (
                    '{"content":"Successfully edited file at index.html.",'
                    '"details":{"diff":"--- index.html\\n+++ index.html\\n@@ -1 +1 @@\\n-a\\n+b\\n",'
                    '"firstChangedLine":1}}'
                ),
            }
        ]
    )

    report_path = logger.write_html_report()

    assert report_path is not None
    html = Path(report_path).read_text(encoding="utf-8")
    assert "type=function_call_output call_id=call-1" in html
    assert "path=index.html" in html
    assert "first_changed_line=1" in html
    assert "diff_chars=" in html
    assert 'preview=&#x27;{&quot;content&quot;:' not in html
