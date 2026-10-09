"""Optional rendered-requirements report for eval outputs.

Checks a generated HTML file against requirements declared up front (text that
must be visible, no horizontal document overflow, contrast for a supported
foreground/background pair, exact computed-style values) at the desktop and
mobile viewports used by ``screenshot_preview``.

Every result is ``pass``, ``fail`` or ``unknown``. A check that cannot be
measured reliably (missing element, translucent colors, background images,
render errors) is ``unknown`` and never counts as ``pass``.

This complements the 1-4 human visual rating; it does not measure visual
similarity, design quality or overall accessibility.

The evaluation semantics are adapted from Style Science GDC-0
(https://github.com/jongos/style-science, Apache-2.0).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple, cast

from preview_screenshot.base import VIEWPORT_SIZES

Status = str  # "pass" | "fail" | "unknown"

CHECKS: Dict[str, Tuple[str, ...]] = {
    "viewport-overflow": (),
    "visible-text": ("selector", "text"),
    "text-contrast": ("selector", "minRatio"),
    "style-equals": ("selector", "property", "expected"),
}
STYLE_PROPERTIES = {
    "color",
    "background-color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-align",
}
OPTIONAL_FIELDS = ("selector", "text", "minRatio", "property", "expected")


def validate_requirements(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a requirements spec; raise ValueError on anything unexpected."""
    if not isinstance(spec, dict) or set(spec) - {"devices", "requirements"}:
        raise ValueError("Spec must be an object with 'requirements' and optional 'devices'")
    devices: Any = spec.get("devices", ["desktop", "mobile"])
    if (
        not isinstance(devices, list)
        or not devices
        or not all(isinstance(d, str) and d in VIEWPORT_SIZES for d in cast(List[Any], devices))
        or len(set(cast(List[str], devices))) != len(cast(List[str], devices))
    ):
        raise ValueError(f"devices must be a nonempty subset of {sorted(VIEWPORT_SIZES)}")
    raw_rules: Any = spec.get("requirements")
    if not isinstance(raw_rules, list) or not raw_rules:
        raise ValueError("requirements must be a nonempty list")
    rules = cast(List[Any], raw_rules)
    ids: set[str] = set()
    for raw in rules:
        if not isinstance(raw, dict):
            raise ValueError("Each requirement must be an object")
        rule = cast(Dict[str, Any], raw)
        if set(rule) - {"id", "check", *OPTIONAL_FIELDS}:
            raise ValueError("Unknown requirement field")
        rid: Any = rule.get("id")
        if not isinstance(rid, str) or not rid.strip() or rid in ids:
            raise ValueError("Each requirement needs a unique nonempty id")
        ids.add(rid)
        check: Any = rule.get("check")
        if check not in CHECKS:
            raise ValueError(f"{rid}: unsupported check {check!r}")
        for key in OPTIONAL_FIELDS:
            if key in CHECKS[check]:
                value: Any = rule.get(key)
                if key == "minRatio":
                    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or not 1 <= value <= 21:
                        raise ValueError(f"{rid}: minRatio must be between 1 and 21")
                elif not isinstance(value, str) or not value.strip():
                    raise ValueError(f"{rid}: {key} must be a nonempty string")
            elif key in rule:
                raise ValueError(f"{rid}: field {key!r} does not apply to {check}")
        if check == "style-equals" and rule["property"] not in STYLE_PROPERTIES:
            raise ValueError(f"{rid}: unsupported property {rule['property']!r}")
    return {"devices": devices, "requirements": rules}


def _parse_opaque_rgb(value: Any) -> Optional[Tuple[int, int, int]]:
    """Parse a computed ``rgb()``/``rgba()`` color; None unless fully opaque."""
    if not isinstance(value, str):
        return None
    m = re.fullmatch(r"rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)", value.strip())
    if not m or (m.group(4) is not None and float(m.group(4)) != 1):
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def contrast_ratio(a: Tuple[int, int, int], b: Tuple[int, int, int]) -> float:
    """WCAG 2.x contrast ratio for two opaque sRGB colors."""

    def luminance(rgb: Tuple[int, int, int]) -> float:
        linear = [
            c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
            for c in (v / 255 for v in rgb)
        ]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    x, y = luminance(a), luminance(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)


def _norm(text: str) -> str:
    return " ".join(text.split())


def evaluate(rule: Dict[str, Any], m: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Turn one raw measurement into pass/fail/unknown. Pure function."""
    if not isinstance(m, dict):
        return {"status": "unknown", "detail": "Measurement absent"}
    if m.get("unknown"):
        return {"status": "unknown", "detail": str(m["unknown"])}
    check = rule["check"]
    try:
        if check == "viewport-overflow":
            scroll, client = m["scrollWidth"], m["clientWidth"]
            if type(scroll) not in (int, float) or type(client) not in (int, float) or client <= 0:
                raise ValueError("Invalid dimensions")
            value: Any = max(0, scroll - client)
            passed = value == 0
        elif check == "visible-text":
            if type(m.get("visible")) is not bool or not isinstance(m.get("text"), str):
                raise ValueError("Invalid text measurement")
            value = m["visible"] and _norm(rule["text"]) in _norm(m["text"])
            passed = value
        elif check == "text-contrast":
            fg, bg = _parse_opaque_rgb(m.get("foreground")), _parse_opaque_rgb(m.get("background"))
            if fg is None or bg is None:
                return {"status": "unknown", "detail": "Unsupported (non-opaque) color pair"}
            value = round(contrast_ratio(fg, bg), 2)
            passed = contrast_ratio(fg, bg) >= rule["minRatio"]
        else:
            value = m.get("value")
            if not isinstance(value, str):
                raise ValueError("Invalid computed style")
            passed = value == rule["expected"]
    except (KeyError, ValueError, TypeError) as exc:
        return {"status": "unknown", "detail": str(exc)}
    return {"status": "pass" if passed else "fail", "value": value}


def overall_status(results: List[Dict[str, Any]]) -> Status:
    statuses = {r["status"] for r in results}
    if "fail" in statuses:
        return "fail"
    if "unknown" in statuses or not results:
        return "unknown"
    return "pass"


# Runs in the page. Returns raw observations only; judging happens in Python.
_MEASURE_JS = """
(rules) => {
  const visible = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse'
          || parseFloat(s.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const one = (sel) => {
    let nodes;
    try { nodes = document.querySelectorAll(sel); } catch (e) { return {unknown: 'Invalid selector'}; }
    if (nodes.length !== 1) return {unknown: `Selector matched ${nodes.length} elements; expected 1`};
    return {el: nodes[0]};
  };
  const out = {};
  for (const rule of rules) {
    if (rule.check === 'viewport-overflow') {
      const d = document.documentElement;
      out[rule.id] = {scrollWidth: d.scrollWidth, clientWidth: d.clientWidth};
      continue;
    }
    const found = one(rule.selector);
    if (found.unknown) {
      // A missing element is a failed text requirement, not an unmeasurable one.
      out[rule.id] = rule.check === 'visible-text' && found.unknown.startsWith('Selector matched 0')
        ? {visible: false, text: ''} : found;
      continue;
    }
    const el = found.el, s = getComputedStyle(el);
    if (rule.check === 'visible-text') {
      out[rule.id] = {visible: visible(el), text: el.innerText || ''};
    } else if (rule.check === 'style-equals') {
      out[rule.id] = {value: s.getPropertyValue(rule.property)};
    } else {
      let bg = null;
      for (let n = el; n; n = n.parentElement) {
        const ns = getComputedStyle(n);
        if (ns.backgroundImage !== 'none') { bg = {unknown: 'Background image or gradient'}; break; }
        const c = ns.backgroundColor;
        if (c === 'rgba(0, 0, 0, 0)' || c === 'transparent') continue;
        bg = c; break;
      }
      if (bg === null) bg = 'rgb(255, 255, 255)';  // default canvas in light scheme
      out[rule.id] = bg.unknown ? bg : {foreground: s.color, background: bg};
    }
  }
  return out;
}
"""


async def measure_html(html: str, spec: Dict[str, Any], browser: Any) -> Dict[str, Dict[str, Any]]:
    """Render ``html`` at each device viewport and collect raw measurements."""
    by_device: Dict[str, Dict[str, Any]] = {}
    for device in spec["devices"]:
        width, height = VIEWPORT_SIZES[device]
        page = await browser.new_page(viewport={"width": width, "height": height}, color_scheme="light")
        try:
            try:
                await page.set_content(html, wait_until="networkidle", timeout=15000)
            except Exception:
                pass  # measure whatever rendered
            await page.wait_for_timeout(250)
            by_device[device] = await page.evaluate(_MEASURE_JS, spec["requirements"])
        except Exception as exc:  # render failure -> every check unknown
            by_device[device] = {r["id"]: {"unknown": f"Render error: {exc}"} for r in spec["requirements"]}
        finally:
            await page.close()
    return by_device


def build_report(spec: Dict[str, Any], measurements: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    results = []
    for device in spec["devices"]:
        for rule in spec["requirements"]:
            results.append(
                {
                    "device": device,
                    "requirement": rule["id"],
                    "check": rule["check"],
                    **evaluate(rule, measurements.get(device, {}).get(rule["id"])),
                }
            )
    return {
        "status": overall_status(results),
        "results": results,
        "scope": "Declared checks at the listed viewports only. Not a measure of visual "
        "similarity, design quality, or accessibility conformance.",
    }


async def report_for_files(spec: Dict[str, Any], paths: List[str]) -> Dict[str, Any]:
    from playwright.async_api import async_playwright

    spec = validate_requirements(spec)
    reports: Dict[str, Any] = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            for path in paths:
                with open(path, encoding="utf-8") as f:
                    html = f.read()
                reports[os.path.basename(path)] = build_report(spec, await measure_html(html, spec, browser))
        finally:
            await browser.close()
    return reports


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Rendered requirements report for generated HTML.")
    parser.add_argument("spec", help="requirements JSON file")
    parser.add_argument("html", nargs="+", help="generated HTML file(s) to check")
    args = parser.parse_args(argv)
    with open(args.spec, encoding="utf-8") as f:
        spec = json.load(f)
    reports = asyncio.run(report_for_files(spec, args.html))
    print(json.dumps(reports, indent=2))
    for name, rep in reports.items():
        print(f"{name}: {rep['status']}", file=sys.stderr)
    return 0 if all(r["status"] == "pass" for r in reports.values()) else 2


if __name__ == "__main__":
    sys.exit(main())
