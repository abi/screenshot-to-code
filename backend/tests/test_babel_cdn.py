from babel_cdn import PINNED_BABEL_STANDALONE_URL, normalize_babel_cdn


def test_rewrites_unversioned_unpkg() -> None:
    html = '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>'
    out = normalize_babel_cdn(html)
    assert PINNED_BABEL_STANDALONE_URL in out
    assert "@babel/standalone/babel.min.js" not in out  # unversioned form gone


def test_rewrites_versioned_and_jsdelivr_and_nonmin() -> None:
    for url in [
        "https://unpkg.com/@babel/standalone@8.0.0/babel.min.js",
        "https://unpkg.com/@babel/standalone@7.20.0/babel.js",
        "https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js",
    ]:
        out = normalize_babel_cdn(f'<script src="{url}"></script>')
        assert out == f'<script src="{PINNED_BABEL_STANDALONE_URL}"></script>'


def test_leaves_other_cdns_untouched() -> None:
    html = (
        '<script src="https://cdn.tailwindcss.com"></script>'
        '<script src="https://cdn.jsdelivr.net/npm/react@18.0.0/umd/react.development.js"></script>'
    )
    assert normalize_babel_cdn(html) == html


def test_idempotent_on_pinned_url() -> None:
    html = f'<script src="{PINNED_BABEL_STANDALONE_URL}"></script>'
    assert normalize_babel_cdn(html) == html
