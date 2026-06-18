import pytest
from routes.saas_utils import FreeTrialUsageResponse, SubscriptionCreditsResponse
from routes.screenshot import capture_screenshot, normalize_url


class TestNormalizeUrl:
    """Test cases for URL normalization functionality."""
    
    def test_url_without_protocol(self):
        """Test that URLs without protocol get https:// added."""
        assert normalize_url("example.com") == "https://example.com"
        assert normalize_url("www.example.com") == "https://www.example.com"
        assert normalize_url("subdomain.example.com") == "https://subdomain.example.com"
    
    def test_url_with_http_protocol(self):
        """Test that existing http protocol is preserved."""
        assert normalize_url("http://example.com") == "http://example.com"
        assert normalize_url("http://www.example.com") == "http://www.example.com"
    
    def test_url_with_https_protocol(self):
        """Test that existing https protocol is preserved."""
        assert normalize_url("https://example.com") == "https://example.com"
        assert normalize_url("https://www.example.com") == "https://www.example.com"
    
    def test_url_with_path_and_params(self):
        """Test URLs with paths and query parameters."""
        assert normalize_url("example.com/path") == "https://example.com/path"
        assert normalize_url("example.com/path?param=value") == "https://example.com/path?param=value"
        assert normalize_url("example.com:8080/path") == "https://example.com:8080/path"
    
    def test_url_with_whitespace(self):
        """Test that whitespace is stripped."""
        assert normalize_url("  example.com  ") == "https://example.com"
        assert normalize_url("\texample.com\n") == "https://example.com"
    
    def test_invalid_protocols(self):
        """Test that unsupported protocols raise ValueError."""
        with pytest.raises(ValueError, match="Unsupported protocol: ftp"):
            normalize_url("ftp://example.com")
        
        with pytest.raises(ValueError, match="Unsupported protocol: file"):
            normalize_url("file:///path/to/file")
    
    def test_localhost_urls(self):
        """Test localhost URLs."""
        assert normalize_url("localhost") == "https://localhost"
        assert normalize_url("localhost:3000") == "https://localhost:3000"
        assert normalize_url("http://localhost:8080") == "http://localhost:8080"
    
    def test_ip_address_urls(self):
        """Test IP address URLs."""
        assert normalize_url("192.168.1.1") == "https://192.168.1.1"
        assert normalize_url("192.168.1.1:8080") == "https://192.168.1.1:8080"
        assert normalize_url("http://192.168.1.1") == "http://192.168.1.1"
    
    def test_complex_urls(self):
        """Test more complex URL scenarios."""
        assert normalize_url("example.com/path/to/page.html#section") == "https://example.com/path/to/page.html#section"
        assert normalize_url("user:pass@example.com") == "https://user:pass@example.com"
        assert normalize_url("example.com?q=search&lang=en") == "https://example.com?q=search&lang=en"


class _FakeScreenshotResponse:
    status_code = 200
    content = b"png-bytes"


class _FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url, params):
        assert params["access_key"] == "platform-screenshotone-key"
        return _FakeScreenshotResponse()


@pytest.mark.asyncio
async def test_capture_screenshot_allows_free_trial_without_user_api_key(monkeypatch):
    async def fake_credits(auth_token: str):
        assert auth_token == "token"
        return SubscriptionCreditsResponse(user_id="user_123", status="not_subscriber")

    async def fake_free_trial_usage(auth_token: str):
        assert auth_token == "token"
        return FreeTrialUsageResponse(used=0, limit=1)

    monkeypatch.setattr(
        "routes.screenshot.PLATFORM_SCREENSHOTONE_API_KEY",
        "platform-screenshotone-key",
    )
    monkeypatch.setattr(
        "routes.screenshot.does_user_have_subscription_credits", fake_credits
    )
    monkeypatch.setattr("routes.screenshot.get_free_trial_usage", fake_free_trial_usage)
    monkeypatch.setattr("routes.screenshot.httpx.AsyncClient", _FakeAsyncClient)

    image_bytes = await capture_screenshot(
        "https://example.com", api_key=None, auth_token="token", is_free_trial=True
    )

    assert image_bytes == b"png-bytes"


@pytest.mark.asyncio
async def test_capture_screenshot_rejects_exhausted_free_trial_without_user_api_key(monkeypatch):
    async def fake_credits(auth_token: str):
        return SubscriptionCreditsResponse(user_id="user_123", status="not_subscriber")

    async def fake_free_trial_usage(auth_token: str):
        return FreeTrialUsageResponse(used=1, limit=1)

    monkeypatch.setattr(
        "routes.screenshot.does_user_have_subscription_credits", fake_credits
    )
    monkeypatch.setattr("routes.screenshot.get_free_trial_usage", fake_free_trial_usage)

    with pytest.raises(Exception, match="User is not subscriber and has no API key"):
        await capture_screenshot(
            "https://example.com", api_key=None, auth_token="token", is_free_trial=True
        )
