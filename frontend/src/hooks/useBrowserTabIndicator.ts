import { useEffect } from "react";

const CODING_SETTINGS = {
  title: "Coding...",
  favicon: "/favicon/coding.png",
};
const DEFAULT_SETTINGS = {
  title: "Screenshot to Code",
  favicon: "/favicon/main.png",
};

const DEV_FAVICON_COLORS = {
  default: "#22c55e",
  coding: "#ef4444",
};

const getAugmentedFaviconDataUrl = (
  baseUrl: string,
  dotColor: string
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = Math.max(img.width, img.height, 64);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Center the favicon in case it's not square
      const x = (size - img.width) / 2;
      const y = (size - img.height) / 2;
      ctx.drawImage(img, x, y);

      // Add a noticeable dev dot in the top-left corner
      const dotRadius = Math.max(10, Math.round(size * 0.3));
      const dotCx = size - dotRadius - Math.round(size * 0.04);
      const dotCy = size - dotRadius - Math.round(size * 0.04);
      ctx.beginPath();
      ctx.arc(dotCx, dotCy, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.lineWidth = Math.max(3, Math.round(size * 0.08));
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load favicon"));
    img.src = baseUrl;
  });

const isDevHost = () => {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
};

const useBrowserTabIndicator = (isCoding: boolean) => {
  useEffect(() => {
    const settings = isCoding ? CODING_SETTINGS : DEFAULT_SETTINGS;

    // Set favicon
    const faviconEl = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;
    if (faviconEl) {
      if (isDevHost()) {
        let cancelled = false;
        const dotColor = isCoding
          ? DEV_FAVICON_COLORS.coding
          : DEV_FAVICON_COLORS.default;
        getAugmentedFaviconDataUrl(settings.favicon, dotColor)
          .then((dataUrl) => {
            if (!cancelled && faviconEl) {
              faviconEl.href = dataUrl;
            }
          })
          .catch(() => {
            if (!cancelled && faviconEl) {
              faviconEl.href = settings.favicon;
            }
          });
        return () => {
          cancelled = true;
        };
      } else {
        faviconEl.href = settings.favicon;
      }
    }

    // Set title
    document.title = settings.title;
  }, [isCoding]);
};

export default useBrowserTabIndicator;
