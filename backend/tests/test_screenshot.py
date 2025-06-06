import pytest
from routes.screenshot import normalize_url


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
