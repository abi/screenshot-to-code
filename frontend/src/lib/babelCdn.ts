// See backend/babel_cdn.py for the full rationale. Generated React pages load
// @babel/standalone unversioned, which now resolves to Babel 8 — whose
// automatic JSX runtime injects an `import` that breaks in-browser transforms,
// so React never mounts. Pinning to a Babel 7 release keeps the classic runtime
// (React.createElement). We rewrite the CDN URL wherever generated code is
// rendered or exported, so already-generated projects keep working too.
//
// We resolve the URL dynamically to avoid a single hardcoded string that breaks
// silently if the pinned version disappears.  We try (in order):
//   1. The version configured via VITE_BABEL_VERSION env var.
//   2. The pinned fallback list (known-working 7.x versions).
//   3. The latest available 7.x version from unpkg.
// The result is cached after the first successful fetch so subsequent calls
// return instantly without a network round-trip.

const BABEL_CDN_RE =
  /https?:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm)\/@babel\/standalone(?:@[0-9.]+)?\/babel(?:\.min)?\.js/g;

/** Known-working Babel 7.x versions — used as fallback when no version is configured. */
const FALLBACK_VERSIONS = ["7.25.9", "7.25.8", "7.25.7", "7.25.6"] as const;

type ResolvedUrl = string;
let _cachedUrl: ResolvedUrl | null = null;

/**
 * Probe the Babel CDN until we find a reachable URL.
 * Returns the first URL that responds with HTTP 200.
 */
async function _probeBabelUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", mode: "cors" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve the Babel CDN URL to use.
 *
 * Strategy:
 * 1. If `preferredVersion` is supplied (from runtime Settings), try it first,
 *    then the full fallback list.
 * 2. Otherwise, use the build-time `VITE_BABEL_VERSION` env var if set,
 *    falling back to the FALLBACK_VERSIONS list.
 * 3. If all fail, ask unpkg for the latest 7.x version tag.
 *
 * Set `force = true` to ignore the cache and re-probe (used after the user
 * changes the Babel version in Settings).
 */
export async function resolveBabelCdnUrl(
  preferredVersion?: string,
  force = false
): Promise<ResolvedUrl> {
  if (_cachedUrl && !force) return _cachedUrl;

  // Collect candidate versions in priority order.
  const envVersion = import.meta.env["VITE_BABEL_VERSION"] as string | undefined;
  const topVersion = preferredVersion ?? envVersion;
  const candidates: readonly string[] = topVersion
    ? [topVersion, ...FALLBACK_VERSIONS]
    : [...FALLBACK_VERSIONS];

  for (const version of candidates) {
    const url = `https://unpkg.com/@babel/standalone@${version}/babel.min.js`;
    if (await _probeBabelUrl(url)) {
      _cachedUrl = url;
      return url;
    }
  }

  // Last resort: ask unpkg for the latest 7.x version tagged.
  try {
    const res = await fetch(
      "https://unpkg.com/@babel/standalone?meta",
      { mode: "cors" }
    );
    if (res.ok) {
      const meta = (await res.json()) as { version?: string };
      const latest7 = meta.version;
      if (latest7 && latest7.startsWith("7.")) {
        const url = `https://unpkg.com/@babel/standalone@${latest7}/babel.min.js`;
        if (await _probeBabelUrl(url)) {
          _cachedUrl = url;
          return url;
        }
      }
    }
  } catch {
    // ignore — fall through to error
  }

  throw new Error(
    "All Babel CDN URLs unreachable — check your internet connection. " +
    "You can set VITE_BABEL_VERSION in frontend/.env to pin a specific version."
  );
}

/**
 * Synchronously rewrite all Babel CDN URLs in `html` to the cached URL.
 * If the URL has not been resolved yet (i.e., this is called before
 * `resolveBabelCdnUrl()` has been awaited), the hardcoded pinned URL is used
 * as a safe fallback so generated pages never break due to CDN timing.
 */
export function normalizeBabelCdn(html: string): string {
  const pinned = "https://unpkg.com/@babel/standalone@7.25.6/babel.min.js";
  const target = _cachedUrl ?? pinned;
  return html.replace(BABEL_CDN_RE, target);
}
