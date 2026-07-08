// Default to false if set to anything other than "true" or unset
export const IS_RUNNING_ON_CLOUD =
  import.meta.env.VITE_IS_DEPLOYED === "true" || false;

// When no explicit backend URLs are provided, default to the same origin the
// app is served from. Combined with the Vite dev-server proxy, this makes the
// app work behind tunnels/preview URLs where "localhost" would point at the
// viewer's machine instead of the sandbox.
const SAME_ORIGIN_HTTP =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://127.0.0.1:5175";
const SAME_ORIGIN_WS = SAME_ORIGIN_HTTP.replace(/^http/, "ws");

export const WS_BACKEND_URL =
  import.meta.env.VITE_WS_BACKEND_URL || SAME_ORIGIN_WS;

export const HTTP_BACKEND_URL =
  import.meta.env.VITE_HTTP_BACKEND_URL || SAME_ORIGIN_HTTP;

// Hosted version only

// Feature flags
export const SHOULD_SHOW_FEEDBACK_CALL_UI =
  import.meta.env.VITE_SHOW_FEEDBACK_CALL_UI === "true";
export const SHOULD_SHOW_FEEDBACK_CALL_NOTE = SHOULD_SHOW_FEEDBACK_CALL_UI;

// SaaS Backend
export const SAAS_BACKEND_URL = import.meta.env.VITE_SAAS_BACKEND_URL || null;

// Clerk
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null;

// Stripe
export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null;

// Sentry
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || null;

// PostHog
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || null;
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || null;

// LogRocket
export const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID || null;

// Google Ads
export const GOOGLE_ADS_REGISTRATION_CONVERSION_SEND_TO =
  "AW-16649848443/YQQoCIuo9bccEPuMooM-";
export const GOOGLE_ADS_CHECKOUT_STARTED_CONVERSION_SEND_TO =
  "AW-16649848443/MKvxCLvr9bccEPuMooM-";
export const GOOGLE_ADS_PURCHASE_CONVERSION_SEND_TO =
  "AW-16649848443/_m-eCM_J37ccEPuMooM-";
