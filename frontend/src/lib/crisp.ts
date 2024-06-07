import { CRISP_WEBSITE_ID } from "../config";

export const loadCrispChat = (): (() => void) => {
  if (document.getElementById("crisp-chat-script")) {
    // The script element already exists, so don't add it again
    return () => {};
  }

  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  const d = document;
  const s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = true;
  d.getElementsByTagName("head")[0].appendChild(s);

  return () => {
    // Cleanup function to remove the script when it's no longer needed
    const scriptElement = document.getElementById("crisp-chat-script");
    if (scriptElement && scriptElement.parentNode) {
      scriptElement.parentNode.removeChild(scriptElement);
    }
  };
};

declare global {
  interface Window {
    // Crisp
    $crisp: unknown[]; // TODO: Replace with better type
    CRISP_WEBSITE_ID: string;
  }
}
