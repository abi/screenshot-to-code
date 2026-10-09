import os
from typing import Any, Dict

import pytest

from evals.requirements_report import (
    build_report,
    contrast_ratio,
    evaluate,
    report_for_files,
    validate_requirements,
)

EXAMPLES = os.path.join(os.path.dirname(__file__), "..", "evals", "requirements_examples")
TEXT_RULE: Dict[str, Any] = {"id": "t", "check": "visible-text", "selector": "h1", "text": "Plan  your\ntrip"}
CONTRAST_RULE: Dict[str, Any] = {"id": "c", "check": "text-contrast", "selector": ".cta", "minRatio": 4.5}


def test_validate_rejects_irrelevant_and_unknown_fields():
    with pytest.raises(ValueError):
        validate_requirements({"requirements": [{"id": "o", "check": "viewport-overflow", "text": "x"}]})
    with pytest.raises(ValueError):
        validate_requirements({"requirements": [{"id": "o", "check": "looks-good"}]})
    with pytest.raises(ValueError):
        validate_requirements({"devices": ["tablet"], "requirements": [{"id": "o", "check": "viewport-overflow"}]})


def test_contrast_ratio_known_values():
    assert contrast_ratio((0, 0, 0), (255, 255, 255)) == pytest.approx(21.0)
    assert contrast_ratio((119, 119, 119), (255, 255, 255)) == pytest.approx(4.48, abs=0.01)


def test_text_whitespace_normalized_and_hidden_fails():
    assert evaluate(TEXT_RULE, {"visible": True, "text": "Plan your trip"})["status"] == "pass"
    assert evaluate(TEXT_RULE, {"visible": False, "text": "Plan your trip"})["status"] == "fail"


def test_unmeasurable_is_unknown_never_pass():
    assert evaluate(TEXT_RULE, None)["status"] == "unknown"
    assert evaluate(CONTRAST_RULE, {"unknown": "Background image or gradient"})["status"] == "unknown"
    translucent = {"foreground": "rgba(0, 0, 0, 0.5)", "background": "rgb(255, 255, 255)"}
    assert evaluate(CONTRAST_RULE, translucent)["status"] == "unknown"
    assert evaluate({"id": "o", "check": "viewport-overflow"}, {"scrollWidth": "x", "clientWidth": 1})["status"] == "unknown"


def test_overall_status_precedence():
    spec = validate_requirements({"devices": ["desktop"], "requirements": [TEXT_RULE, CONTRAST_RULE]})
    only_unknown = build_report(spec, {"desktop": {"t": {"visible": True, "text": "Plan your trip"}}})
    assert only_unknown["status"] == "unknown"
    with_fail = build_report(spec, {"desktop": {"t": {"visible": False, "text": ""}}})
    assert with_fail["status"] == "fail"


def _chromium_available() -> bool:
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            p.chromium.launch(args=["--no-sandbox"]).close()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _chromium_available(), reason="Playwright Chromium not installed")
async def test_example_regression_caught_in_browser():
    import json

    with open(os.path.join(EXAMPLES, "requirements.json")) as f:
        spec = json.load(f)
    reports = await report_for_files(
        spec,
        [os.path.join(EXAMPLES, n) for n in ("candidate_ok.html", "candidate_regressed.html")],
    )
    assert reports["candidate_ok.html"]["status"] == "pass"
    bad = reports["candidate_regressed.html"]
    assert bad["status"] == "fail"
    failed = {(r["device"], r["requirement"]) for r in bad["results"] if r["status"] == "fail"}
    assert failed == {
        ("desktop", "pricing-note"),
        ("mobile", "pricing-note"),
        ("mobile", "no-horizontal-overflow"),
    }
