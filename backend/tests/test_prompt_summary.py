import pytest
from utils import format_prompt_summary


def test_format_prompt_summary():
    messages = [
        {"role": "system", "content": "lorem ipsum dolor sit amet"},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "hello world"},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAA"}},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,BBB"}},
            ],
        },
    ]

    summary = format_prompt_summary(messages)
    assert "system: lorem ipsum" in summary
    assert "[2 images]" in summary
