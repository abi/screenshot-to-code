#!/usr/bin/env python3
"""
Test script for URL normalization functionality.
Run with: python test_url_normalization.py
"""

import sys
from urllib.parse import urlparse


def normalize_url(url: str) -> str:
    """
    Normalize URL to ensure it has a proper protocol.
    If no protocol is specified, default to https://
    """
    url = url.strip()
    
    # Parse the URL
    parsed = urlparse(url)
    
    # Check if we have a scheme
    if not parsed.scheme:
        # No scheme, add https://
        url = f"https://{url}"
    elif parsed.scheme in ['http', 'https']:
        # Valid scheme, keep as is
        pass
    else:
        # Check if this might be a domain with port (like example.com:8080)
        # urlparse treats this as scheme:netloc, but we want to handle it as domain:port
        if ':' in url and not url.startswith(('http://', 'https://', 'ftp://', 'file://')):
            # Likely a domain:port without protocol
            url = f"https://{url}"
        else:
            # Invalid protocol
            raise ValueError(f"Unsupported protocol: {parsed.scheme}")
    
    return url


def test_url_without_protocol():
    print("Testing URLs without protocol...")
    assert normalize_url("example.com") == "https://example.com"
    assert normalize_url("www.example.com") == "https://www.example.com"
    assert normalize_url("subdomain.example.com") == "https://subdomain.example.com"
    print("✓ URLs without protocol: PASSED")


def test_url_with_http_protocol():
    print("Testing URLs with HTTP protocol...")
    assert normalize_url("http://example.com") == "http://example.com"
    assert normalize_url("http://www.example.com") == "http://www.example.com"
    print("✓ URLs with HTTP protocol: PASSED")


def test_url_with_https_protocol():
    print("Testing URLs with HTTPS protocol...")
    assert normalize_url("https://example.com") == "https://example.com"
    assert normalize_url("https://www.example.com") == "https://www.example.com"
    print("✓ URLs with HTTPS protocol: PASSED")


def test_url_with_path_and_params():
    print("Testing URLs with paths and parameters...")
    assert normalize_url("example.com/path") == "https://example.com/path"
    assert normalize_url("example.com/path?param=value") == "https://example.com/path?param=value"
    assert normalize_url("example.com:8080/path") == "https://example.com:8080/path"
    print("✓ URLs with paths and parameters: PASSED")


def test_url_with_whitespace():
    print("Testing URLs with whitespace...")
    assert normalize_url("  example.com  ") == "https://example.com"
    assert normalize_url("\texample.com\n") == "https://example.com"
    print("✓ URLs with whitespace: PASSED")


def test_invalid_protocols():
    print("Testing invalid protocols...")
    try:
        normalize_url("ftp://example.com")
        assert False, "Should have raised ValueError for ftp protocol"
    except ValueError as e:
        assert "Unsupported protocol: ftp" in str(e)
    
    try:
        normalize_url("file:///path/to/file")
        assert False, "Should have raised ValueError for file protocol"
    except ValueError as e:
        assert "Unsupported protocol: file" in str(e)
    
    print("✓ Invalid protocols: PASSED")


def test_localhost_urls():
    print("Testing localhost URLs...")
    assert normalize_url("localhost") == "https://localhost"
    assert normalize_url("localhost:3000") == "https://localhost:3000"
    assert normalize_url("http://localhost:8080") == "http://localhost:8080"
    print("✓ Localhost URLs: PASSED")


def test_ip_address_urls():
    print("Testing IP address URLs...")
    assert normalize_url("192.168.1.1") == "https://192.168.1.1"
    assert normalize_url("192.168.1.1:8080") == "https://192.168.1.1:8080"
    assert normalize_url("http://192.168.1.1") == "http://192.168.1.1"
    print("✓ IP address URLs: PASSED")


def test_complex_urls():
    print("Testing complex URLs...")
    assert normalize_url("example.com/path/to/page.html#section") == "https://example.com/path/to/page.html#section"
    assert normalize_url("user:pass@example.com") == "https://user:pass@example.com"
    assert normalize_url("example.com?q=search&lang=en") == "https://example.com?q=search&lang=en"
    print("✓ Complex URLs: PASSED")


def run_all_tests():
    print("Running URL normalization tests...\n")
    
    tests = [
        test_url_without_protocol,
        test_url_with_http_protocol,
        test_url_with_https_protocol,
        test_url_with_path_and_params,
        test_url_with_whitespace,
        test_invalid_protocols,
        test_localhost_urls,
        test_ip_address_urls,
        test_complex_urls
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"✗ {test.__name__}: FAILED")
            print(f"  Error: {e}")
            return False
    
    print("\n✅ All tests passed!")
    return True


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
