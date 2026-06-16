"""Eval output HTML must point local-asset references at a reachable host so
the saved pages render the real crops at review time."""

from evals.runner import normalize_local_asset_urls


def test_normalize_local_asset_urls_rewrites_to_base(monkeypatch) -> None:
    monkeypatch.setattr("evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:9999")

    html = (
        '<img src="/local-assets/asset_a.png">'
        "<img src='/local-assets/asset_b.png'>"
        '<div style="background:url(/local-assets/asset_c.png)"></div>'
        '<img src="http://localhost:5173/local-assets/asset_d.png">'
    )
    out = normalize_local_asset_urls(html)

    base = "http://eval-host:9999/local-assets/"
    assert f'"{base}asset_a.png"' in out
    assert f"'{base}asset_b.png'" in out
    assert f"url({base}asset_c.png)" in out
    assert f'"{base}asset_d.png"' in out
    # No hostless root-relative or dev-server references survive.
    assert '"/local-assets/' not in out
    assert "localhost:5173/local-assets/" not in out


def test_normalize_local_asset_urls_leaves_public_urls_untouched(monkeypatch) -> None:
    monkeypatch.setattr("evals.runner.LOCAL_ASSET_BASE_URL", "http://eval-host:9999")
    html = '<img src="https://replicate.delivery/xyz/out.png">'
    assert normalize_local_asset_urls(html) == html
