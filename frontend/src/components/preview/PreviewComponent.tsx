import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../../hooks/useThrottle";
import EditPopup from "../select-and-edit/EditPopup";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  doUpdate: (updateInstruction: string, selectedElement?: HTMLElement) => void;
  onScaleChange?: (scale: number) => void;
  viewMode?: "fit" | "actual";
}

const MOBILE_VIEWPORT_WIDTH = 375;
export const DESKTOP_VIEWPORT_WIDTH = 1366;

function PreviewComponent({
  code,
  device,
  doUpdate,
  onScaleChange,
  viewMode,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  // Select and edit functionality
  const [clickEvent, setClickEvent] = useState<MouseEvent | null>(null);
  const [scale, setScale] = useState(1);
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

  // Apply a fixed viewport per device and scale to fit the available pane.
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
        const iframeHeight = scaleValue > 0 ? viewportHeight / scaleValue : viewportHeight;

        setScale(scaleValue);
        onScaleChange?.(scaleValue);
        iframe.style.width = `${DESKTOP_VIEWPORT_WIDTH}px`;
        iframe.style.height = `${iframeHeight}px`;
        iframe.style.transform = `scale(${scaleValue})`;
        iframe.style.transformOrigin = "top left";
        return;
      }

      setScale(1);
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
    if (iframe.srcdoc !== throttledCode) {
      iframe.srcdoc = throttledCode;
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
          className={classNames(
            {
              "border-0": true,
            }
          )}
        ></iframe>
        <EditPopup
          event={clickEvent}
          iframeRef={iframeRef}
          doUpdate={doUpdate}
          scale={scale}
        />
      </div>
    </div>
  );
}

export default PreviewComponent;
