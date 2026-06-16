// See backend/babel_cdn.py for the full rationale. Generated React pages load
// @babel/standalone unversioned, which now resolves to Babel 8 — whose
// automatic JSX runtime injects an `import` that breaks in-browser transforms,
// so React never mounts. Pinning to a Babel 7 release keeps the classic runtime
// (React.createElement). We rewrite the CDN URL wherever generated code is
// rendered or exported, so already-generated projects keep working too.

const PINNED_BABEL_STANDALONE_URL =
  "https://unpkg.com/@babel/standalone@7.25.6/babel.min.js";

const BABEL_CDN_RE =
  /https?:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm)\/@babel\/standalone(?:@[0-9.]+)?\/babel(?:\.min)?\.js/g;

export function normalizeBabelCdn(html: string): string {
  return html.replace(BABEL_CDN_RE, PINNED_BABEL_STANDALONE_URL);
}
