// Default to false if set to anything other than "true" or unset
export const IS_RUNNING_ON_CLOUD =
  import.meta.env.VITE_IS_DEPLOYED === "true" || false;

export const WS_BACKEND_URL =
  import.meta.env.VITE_WS_BACKEND_URL || "ws://127.0.0.1:7001";

export const HTTP_BACKEND_URL =
  import.meta.env.VITE_HTTP_BACKEND_URL || "http://127.0.0.1:7001";

export const PICO_BACKEND_FORM_SECRET =
  import.meta.env.VITE_PICO_BACKEND_FORM_SECRET || null;
