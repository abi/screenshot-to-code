from openai_compat import (
    OPENROUTER_API_BASE_URL,
    OPENROUTER_APP_TITLE,
    OPENROUTER_HTTP_REFERER,
    is_openrouter_base_url,
    normalize_openai_base_url,
    openai_client_headers,
)


def test_detects_openrouter_hosts() -> None:
    assert is_openrouter_base_url("https://openrouter.ai/api/v1")
    assert is_openrouter_base_url("https://www.openrouter.ai")
    assert not is_openrouter_base_url("https://api.openai.com/v1")
    assert not is_openrouter_base_url(None)
    assert not is_openrouter_base_url("")


def test_normalize_completes_openrouter_paths() -> None:
    assert normalize_openai_base_url("https://openrouter.ai") == OPENROUTER_API_BASE_URL
    assert (
        normalize_openai_base_url("https://openrouter.ai/api") == OPENROUTER_API_BASE_URL
    )
    assert (
        normalize_openai_base_url("  https://openrouter.ai/api/v1/  ")
        == OPENROUTER_API_BASE_URL
    )


def test_normalize_leaves_other_proxies_intact() -> None:
    assert (
        normalize_openai_base_url("https://proxy.example/v1")
        == "https://proxy.example/v1"
    )
    assert normalize_openai_base_url("   ") is None
    assert normalize_openai_base_url(None) is None


def test_openrouter_headers_only_for_openrouter() -> None:
    assert openai_client_headers("https://api.openai.com/v1") is None
    headers = openai_client_headers(OPENROUTER_API_BASE_URL)
    assert headers == {
        "HTTP-Referer": OPENROUTER_HTTP_REFERER,
        "X-Title": OPENROUTER_APP_TITLE,
    }
