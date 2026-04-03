from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

from google import genai
from google.genai import types

DEFAULT_MODEL = "gemini-3-flash-preview"

ONEBLOCK_PROMPT = """Generate ONE complete file only.
Output exactly one code block.
Stack: HTML + Tailwind.
Requirements:
- mobile-first
- structure must be: main > section > div.container.mx-auto.px-4
- polished production-level UI
- no placeholder text
- no explanations, only final code
- return only index.html content
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate oneblock Tailwind HTML from a screenshot using Gemini"
    )
    parser.add_argument("--image", required=True, help="Path to input screenshot")
    parser.add_argument(
        "--output",
        default="index.html",
        help="Path to output HTML file (default: index.html)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Gemini model name (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--prompt",
        default=ONEBLOCK_PROMPT,
        help="Custom prompt for generation",
    )
    return parser.parse_args()


def extract_text_from_response(response: types.GenerateContentResponse) -> str:
    direct_text = getattr(response, "text", None)
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text

    candidates = getattr(response, "candidates", None)
    if not isinstance(candidates, list):
        return ""

    chunks: list[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if content is None:
            continue
        parts = getattr(content, "parts", None)
        if not isinstance(parts, list):
            continue

        for part in parts:
            text = getattr(part, "text", None)
            if isinstance(text, str) and text:
                chunks.append(text)

    return "\n".join(chunks)


def unwrap_markdown_code_block(raw: str) -> str:
    text = raw.strip()
    pattern = re.compile(r"^```(?:html)?\s*\n(?P<body>[\s\S]*?)\n```$", re.IGNORECASE)
    match = pattern.match(text)
    if match:
        return match.group("body").strip()
    return text


def main() -> int:
    args = parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Error: GEMINI_API_KEY is required")
        return 1

    image_path = Path(args.image)
    if not image_path.exists() or not image_path.is_file():
        print(f"Error: image file not found: {image_path}")
        return 1

    mime_type = "image/png"
    suffix = image_path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        mime_type = "image/jpeg"
    elif suffix == ".webp":
        mime_type = "image/webp"

    image_bytes = image_path.read_bytes()
    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model=args.model,
        contents=[
            types.Part.from_text(text=args.prompt),
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            temperature=0.2,
            top_p=0.95,
            max_output_tokens=8192,
        ),
    )

    raw_text = extract_text_from_response(response)
    if not raw_text.strip():
        print("Error: Gemini returned empty output")
        return 1

    html = unwrap_markdown_code_block(raw_text)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html + "\n", encoding="utf-8")

    print(f"Generated oneblock HTML at: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
