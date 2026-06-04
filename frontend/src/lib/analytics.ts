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

const BING_ADS_EVENT_BY_GOOGLE_SEND_TO: Record<string, string> = {
  "AW-16649848443/YQQoCIuo9bccEPuMooM-": "Signup Completed",
  "AW-16649848443/MKvxCLvr9bccEPuMooM-": "Checkout Started",
  "AW-16649848443/_m-eCM_J37ccEPuMooM-": "Paid Conversion",
};

export function addBingAdsEvent(eventName: string, payload = {}) {
  try {
    window.uetq?.push("event", eventName, payload);
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

  const bingEventName = BING_ADS_EVENT_BY_GOOGLE_SEND_TO[sendTo];
  if (bingEventName) {
    addBingAdsEvent(bingEventName, props);
  }
}
