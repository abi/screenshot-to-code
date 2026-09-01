export const OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1";

export function isOpenRouterBaseUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  const trimmed = url.trim();
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host === "openrouter.ai" || host.endsWith(".openrouter.ai");
  } catch {
    return /(?:^|\.)openrouter\.ai(?:\/|$)/i.test(trimmed);
  }
}
