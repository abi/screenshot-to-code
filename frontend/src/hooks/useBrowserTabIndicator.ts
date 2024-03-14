import { useEffect } from "react";

const CODING_SETTINGS = {
  title: "Coding...",
  favicon: "/favicon/coding.png",
};
const DEFAULT_SETTINGS = {
  title: "Screenshot to Code",
  favicon: "/favicon/main.png",
};

const useBrowserTabIndicator = (isCoding: boolean) => {
  useEffect(() => {
    const settings = isCoding ? CODING_SETTINGS : DEFAULT_SETTINGS;

    // Set favicon
    const faviconEl = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;
    if (faviconEl) {
      faviconEl.href = settings.favicon;
    }

    // Set title
    document.title = settings.title;
  }, [isCoding]);
};

export default useBrowserTabIndicator;
