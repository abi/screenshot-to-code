const ATTRIBUTION_STORAGE_KEY = "s2c_first_touch_attribution";
const SIGNUP_TRACKING_STORAGE_PREFIX = "s2c_signup_tracked:";

const ATTRIBUTION_PARAM_NAMES = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ttclid",
] as const;

export type AttributionParamName = (typeof ATTRIBUTION_PARAM_NAMES)[number];

export type Attribution = Partial<Record<AttributionParamName, string>> & {
  landing_page: string;
  referrer: string;
  first_seen_at: string;
};

function hasAttributionParams(searchParams: URLSearchParams) {
  return ATTRIBUTION_PARAM_NAMES.some((paramName) =>
    searchParams.has(paramName),
  );
}

function readStoredAttribution(): Attribution | null {
  try {
    const storedValue = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!storedValue) return null;

    return JSON.parse(storedValue) as Attribution;
  } catch {
    return null;
  }
}

export function captureFirstTouchAttribution() {
  try {
    if (readStoredAttribution()) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (!hasAttributionParams(searchParams)) return;

    const attribution: Attribution = {
      landing_page: window.location.href,
      referrer: document.referrer,
      first_seen_at: new Date().toISOString(),
    };

    for (const paramName of ATTRIBUTION_PARAM_NAMES) {
      const value = searchParams.get(paramName);
      if (value) {
        attribution[paramName] = value;
      }
    }

    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(attribution),
    );
  } catch {
    // Attribution should never interrupt signup or checkout.
  }
}

export function getFirstTouchAttribution(): Attribution | null {
  return readStoredAttribution();
}

export function getAttributionEventProps() {
  const attribution = getFirstTouchAttribution();
  if (!attribution) return {};

  return {
    source: attribution.utm_source,
    medium: attribution.utm_medium,
    campaign: attribution.utm_campaign,
    content: attribution.utm_content,
    term: attribution.utm_term,
    has_ttclid: Boolean(attribution.ttclid),
  };
}

export function shouldTrackSignupCompleted(userId: string) {
  try {
    const storageKey = `${SIGNUP_TRACKING_STORAGE_PREFIX}${userId}`;
    if (window.localStorage.getItem(storageKey)) return false;

    window.localStorage.setItem(storageKey, new Date().toISOString());
    return true;
  } catch {
    return true;
  }
}
