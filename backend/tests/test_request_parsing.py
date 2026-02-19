from prompts.request_parsing import parse_prompt_content, parse_prompt_history


def test_parse_prompt_content_with_valid_data() -> None:
    result = parse_prompt_content(
        {
            "text": "Build this page",
            "images": ["img1", "img2"],
            "videos": ["vid1"],
        }
    )

    assert result == {
        "text": "Build this page",
        "images": ["img1", "img2"],
        "videos": ["vid1"],
    }


def test_parse_prompt_content_filters_invalid_media_types() -> None:
    result = parse_prompt_content(
        {
            "text": "Prompt",
            "images": ["img1", 123, None, "img2"],
            "videos": ["vid1", {"x": 1}, "vid2"],
        }
    )

    assert result == {
        "text": "Prompt",
        "images": ["img1", "img2"],
        "videos": ["vid1", "vid2"],
    }


def test_parse_prompt_content_defaults_for_invalid_payload() -> None:
    assert parse_prompt_content(None) == {"text": "", "images": [], "videos": []}
    assert parse_prompt_content("bad") == {"text": "", "images": [], "videos": []}
    assert parse_prompt_content({"text": 1}) == {"text": "", "images": [], "videos": []}


def test_parse_prompt_history_with_valid_entries() -> None:
    result = parse_prompt_history(
        [
            {
                "role": "assistant",
                "text": "<html/>",
                "images": [],
                "videos": [],
            },
            {
                "role": "user",
                "text": "Please update",
                "images": ["img1"],
                "videos": ["vid1"],
            },
        ]
    )

    assert result == [
        {
            "role": "assistant",
            "text": "<html/>",
            "images": [],
            "videos": [],
        },
        {
            "role": "user",
            "text": "Please update",
            "images": ["img1"],
            "videos": ["vid1"],
        },
    ]


def test_parse_prompt_history_filters_invalid_items() -> None:
    result = parse_prompt_history(
        [
            "bad",
            {"role": "tool", "text": "skip me"},
            {"role": "user", "text": "keep me", "images": ["img1", 3], "videos": [None, "vid1"]},
            {"role": "assistant", "text": 123, "images": "bad", "videos": "bad"},
        ]
    )

    assert result == [
        {
            "role": "user",
            "text": "keep me",
            "images": ["img1"],
            "videos": ["vid1"],
        },
        {
            "role": "assistant",
            "text": "",
            "images": [],
            "videos": [],
        },
    ]


def test_parse_prompt_history_defaults_for_invalid_payload() -> None:
    assert parse_prompt_history(None) == []
    assert parse_prompt_history({"role": "user"}) == []
