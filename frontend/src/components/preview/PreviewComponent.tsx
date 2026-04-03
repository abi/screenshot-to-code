import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../../hooks/useThrottle";
import { useAppStore } from "../../store/app-store";
import { addHighlight, removeHighlight } from "../select-and-edit/utils";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  onScaleChange?: (scale: number) => void;
  viewMode?: "fit" | "actual";
}

const MOBILE_VIEWPORT_WIDTH = 375;
export const DESKTOP_VIEWPORT_WIDTH = 1366;

const EMPTY_PREVIEW_DOCUMENT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview pending</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #fafafa;
        color: #3f3f46;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        max-width: 420px;
        width: 100%;
        border: 1px solid #e4e4e7;
        border-radius: 16px;
        background: #ffffff;
        padding: 20px;
        box-sizing: border-box;
        text-align: center;
      }
      h1 {
        margin: 0;
        font-size: 16px;
        color: #18181b;
      }
      p {
        margin: 10px 0 0;
        line-height: 1.6;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Preview pending</h1>
      <p>The preview will appear here once the generated code is ready.</p>
    </div>
  </body>
</html>`;

function PreviewComponent({
  code,
  device,
  onScaleChange,
  viewMode,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const throttledCode = useThrottle(code, 200);

  const [clickEvent, setClickEvent] = useState<MouseEvent | null>(null);
  const activeMode = viewMode ?? "fit";
  const handleIframeClick = useCallback((event: MouseEvent) => {
    setClickEvent(event);
  }, []);

  const handleIframeLinkClick = useCallback((event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (href && href.startsWith("#")) {
      event.preventDefault();
    }
  }, []);

  const { inSelectAndEditMode, selectedElement, setSelectedElement } =
    useAppStore();

  const inSelectAndEditModeRef = useRef(inSelectAndEditMode);
  useEffect(() => {
    inSelectAndEditModeRef.current = inSelectAndEditMode;
  }, [inSelectAndEditMode]);

  useEffect(() => {
    if (!inSelectAndEditModeRef.current || !clickEvent) {
      return;
    }

    clickEvent.preventDefault();

    const targetElement = clickEvent.target as HTMLElement;
    if (!targetElement) return;

    if (selectedElement) {
      removeHighlight(selectedElement);
    }

    addHighlight(targetElement);
    setSelectedElement(targetElement);
  }, [clickEvent, selectedElement, setSelectedElement]);

  useEffect(() => {
    if (!inSelectAndEditMode && selectedElement) {
      removeHighlight(selectedElement);
      setSelectedElement(null);
    }
  }, [inSelectAndEditMode, selectedElement, setSelectedElement]);

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

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const body = iframe.contentWindow?.document.body;
      if (!body) return;
      body.addEventListener("click", handleIframeClick);
      body.addEventListener("click", handleIframeLinkClick);
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      const body = iframe.contentWindow?.document.body;
      if (body) {
        body.removeEventListener("click", handleIframeClick);
        body.removeEventListener("click", handleIframeLinkClick);
      }
    };
  }, [handleIframeClick, handleIframeLinkClick]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const nextDocument =
      throttledCode.trim().length > 0 ? throttledCode : EMPTY_PREVIEW_DOCUMENT;
    if (iframe.srcdoc !== nextDocument) {
      iframe.srcdoc = nextDocument;
    }
  }, [throttledCode]);

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
          className={classNames({
            "border-0": true,
          })}
        ></iframe>
      </div>
    </div>
  );
}

export default PreviewComponent;
