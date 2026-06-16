"""Normalize the @babel/standalone CDN URL in generated HTML.

Generated React pages load @babel/standalone unversioned, which now resolves to
Babel 8 — whose preset-react defaults to the automatic JSX runtime and injects
`import { jsx } from "react/jsx-runtime"`. That import is invalid in a plain
browser <script> with React loaded as a UMD global, so JSX never compiles and
React never mounts (blank preview / screenshot / export).

Pinning to a Babel 7 release keeps the classic runtime (React.createElement),
which works. We rewrite any @babel/standalone CDN reference to a pinned version
wherever generated code is rendered or exported, so already-generated projects
(which baked in the unversioned URL) keep working too.
"""

import re

PINNED_BABEL_STANDALONE_URL = "https://unpkg.com/@babel/standalone@7.25.6/babel.min.js"

_BABEL_CDN_RE = re.compile(
    r"https?://(?:unpkg\.com|cdn\.jsdelivr\.net/npm)/@babel/standalone"
    r"(?:@[0-9.]+)?/babel(?:\.min)?\.js"
)


def normalize_babel_cdn(html: str) -> str:
    """Rewrite any @babel/standalone CDN URL to the pinned, working version."""
    return _BABEL_CDN_RE.sub(PINNED_BABEL_STANDALONE_URL, html)
