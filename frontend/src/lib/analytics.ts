export function addEvent(eventName: string, props = {}) {
  try {
    window.plausible(eventName, { props });
  } catch (e) {
    // silently fail in non-production environments
  }
}

export function addTikTokEvent(eventName: string, payload = {}) {
  try {
    window.ttq?.track(eventName, payload);
  } catch (e) {
    // silently fail in non-production environments
  }
}

export function addGoogleAdsConversion(sendTo: string | null, props = {}) {
  if (!sendTo) return;

  try {
    window.gtag?.("event", "conversion", {
      send_to: sendTo,
      ...props,
    });
  } catch (e) {
    // silently fail in non-production environments
  }
}
