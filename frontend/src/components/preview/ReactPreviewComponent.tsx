import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRunner } from "react-runner";
import { createRoot, Root } from "react-dom/client";
import useThrottle from "../../hooks/useThrottle";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  onScaleChange?: (scale: number) => void;
  viewMode?: "fit" | "actual";
}

const MOBILE_VIEWPORT_WIDTH = 375;
const DESKTOP_VIEWPORT_WIDTH = 1366;
const TAILWIND_CDN_URL = "https://cdn.tailwindcss.com";
const FONT_AWESOME_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css";

function ReactPreviewComponent({
  code,
  device,
  onScaleChange,
  viewMode,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const throttledCode = useThrottle(code, 200);
  const activeMode = viewMode ?? "fit";
  const [iframeReady, setIframeReady] = useState(false);

  const { element, error } = useRunner({
    code: throttledCode,
    scope: {
      import: {
        react: React,
      },
    },
  });

  // Initialize the iframe with Tailwind and a root div
  const setupIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <script src="${TAILWIND_CDN_URL}"></script>
  <link rel="stylesheet" href="${FONT_AWESOME_URL}" />
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="react-root"></div>
</body>
</html>`);
    doc.close();

    // Wait for Tailwind to load before marking ready
    const checkReady = () => {
      const rootEl = doc.getElementById("react-root");
      if (rootEl) {
        if (rootRef.current) {
          rootRef.current.unmount();
        }
        rootRef.current = createRoot(rootEl);
        setIframeReady(true);
      }
    };

    // Give the iframe a moment to parse and load scripts
    setTimeout(checkReady, 100);
  }, []);

  // Set up iframe on mount
  useEffect(() => {
    setupIframe();
    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, [setupIframe]);

  // Render element into iframe whenever it changes
  useEffect(() => {
    if (!iframeReady || !rootRef.current) return;

    if (error) {
      rootRef.current.render(
        React.createElement(
          "div",
          {
            style: {
              padding: "16px",
              color: "#dc2626",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              margin: "8px",
              fontSize: "14px",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            },
          },
          error
        )
      );
    } else if (element) {
      rootRef.current.render(element);
    }
  }, [element, error, iframeReady]);

  // Apply viewport scaling (same logic as PreviewComponent)
  useEffect(() => {
    const updateScale = () => {
      const wrapper = wrapperRef.current;
      const iframe = iframeRef.current;
      if (!wrapper || !iframe) return;

      const viewportWidth = wrapper.clientWidth;
      const viewportHeight = wrapper.clientHeight;

      if (device === "desktop") {
        const scaleValue =
          activeMode === "fit"
            ? Math.min(1, viewportWidth / DESKTOP_VIEWPORT_WIDTH)
            : 1;
        const iframeHeight =
          scaleValue > 0 ? viewportHeight / scaleValue : viewportHeight;

        onScaleChange?.(scaleValue);
        iframe.style.width = `${DESKTOP_VIEWPORT_WIDTH}px`;
        iframe.style.height = `${iframeHeight}px`;
        iframe.style.transform = `scale(${scaleValue})`;
        iframe.style.transformOrigin = "top left";
        return;
      }

      onScaleChange?.(1);
      iframe.style.width = `${MOBILE_VIEWPORT_WIDTH}px`;
      iframe.style.height = `${viewportHeight}px`;
      iframe.style.transform = "scale(1)";
      iframe.style.transformOrigin = "top left";
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    const resizeObserver = new ResizeObserver(updateScale);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }
    return () => {
      window.removeEventListener("resize", updateScale);
      resizeObserver.disconnect();
    };
  }, [activeMode, device, onScaleChange]);

  return (
    <div
      className={`flex-1 min-h-0 relative ${
        device === "mobile"
          ? "flex justify-center overflow-hidden bg-gray-100 dark:bg-zinc-900"
          : activeMode === "fit"
            ? "flex justify-center overflow-hidden"
            : "overflow-auto"
      }`}
    >
      <div
        ref={wrapperRef}
        className={`w-full h-full ${device === "mobile" ? "flex justify-center" : ""}`}
      >
        <iframe
          id={`preview-${device}`}
          ref={iframeRef}
          title="Preview"
          className="border-0"
        />
      </div>
    </div>
  );
}

export default ReactPreviewComponent;
