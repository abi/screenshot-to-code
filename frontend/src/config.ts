// Default to false if set to anything other than "true" or unset
export const IS_RUNNING_ON_CLOUD =
  import.meta.env.VITE_IS_DEPLOYED === "true" || false;

export const WS_BACKEND_URL =
  import.meta.env.VITE_WS_BACKEND_URL || "ws://127.0.0.1:7001";

export const HTTP_BACKEND_URL =
  import.meta.env.VITE_HTTP_BACKEND_URL || "http://127.0.0.1:7001";

// Hosted version only

export const PICO_BACKEND_FORM_SECRET =
  import.meta.env.VITE_PICO_BACKEND_FORM_SECRET || null;

export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null;

export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null;

export const SAAS_BACKEND_URL = import.meta.env.VITE_SAAS_BACKEND_URL || null;

// Feature flags
export const SHOULD_SHOW_FEEDBACK_CALL_NOTE = false;
export const IS_FREE_TRIAL_ENABLED = true;

// PostHog
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || null;
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || null;
