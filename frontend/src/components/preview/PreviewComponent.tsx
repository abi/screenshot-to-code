import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../../hooks/useThrottle";
import { useAppStore } from "../../store/app-store";
import { addHighlight, removeHighlight } from "../select-and-edit/utils";

export interface Annotation {
  selector: string;
  description: string;
}

interface Props {
  code: string;
  device: "mobile" | "desktop";
  onScaleChange?: (scale: number) => void;
  viewMode?: "fit" | "actual";
  annotations?: Annotation[];
}

const MOBILE_VIEWPORT_WIDTH = 375;
export const DESKTOP_VIEWPORT_WIDTH = 1366;

function PreviewComponent({
  code,
  device,
  onScaleChange,
  viewMode,
  annotations,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  // Select and edit functionality
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

  const {
    inSelectAndEditMode,
    selectedElement,
    setSelectedElement,
  } = useAppStore();

  const inSelectAndEditModeRef = useRef(inSelectAndEditMode);
  useEffect(() => {
    inSelectAndEditModeRef.current = inSelectAndEditMode;
  }, [inSelectAndEditMode]);

  // Handle click events to select elements
  useEffect(() => {
    if (!inSelectAndEditModeRef.current || !clickEvent) {
      return;
    }

    clickEvent.preventDefault();

    const targetElement = clickEvent.target as HTMLElement;
    if (!targetElement) return;

    // Remove highlight from previous element
    if (selectedElement) {
      removeHighlight(selectedElement);
    }

    // Highlight and store the new selected element
    addHighlight(targetElement);
    setSelectedElement(targetElement);
  }, [clickEvent, setSelectedElement]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up highlight when exiting select-and-edit mode
  useEffect(() => {
    if (!inSelectAndEditMode && selectedElement) {
      removeHighlight(selectedElement);
      setSelectedElement(null);
    }
  }, [inSelectAndEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (iframe.srcdoc !== throttledCode) {
      iframe.srcdoc = throttledCode;
    }
  }, [throttledCode]);

  // Apply annotation highlights inside the iframe when annotations change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !annotations || annotations.length === 0) return;

    const applyAnnotations = () => {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      // Remove any previously injected annotation styles
      doc.getElementById("__annotation-styles")?.remove();

      // Inject a style tag with a pulsing highlight animation
      const style = doc.createElement("style");
      style.id = "__annotation-styles";
      style.textContent = `
        @keyframes __annotation-pulse {
          0%, 100% { outline-color: rgba(245, 158, 11, 0.8); }
          50% { outline-color: rgba(245, 158, 11, 0.3); }
        }
        .__annotation-highlight {
          outline: 2px solid rgba(245, 158, 11, 0.8);
          outline-offset: 2px;
          animation: __annotation-pulse 2s ease-in-out 3;
        }
      `;
      doc.head.appendChild(style);

      // Query each selector and apply the highlight class
      for (const annotation of annotations) {
        try {
          const el = doc.querySelector(annotation.selector);
          if (el) {
            el.classList.add("__annotation-highlight");
            el.setAttribute("title", annotation.description);
          }
        } catch {
          // Invalid selector — skip silently
        }
      }
    };

    // The iframe may not have loaded yet after srcdoc changes, so listen for load
    iframe.addEventListener("load", applyAnnotations);
    // Also try immediately in case the iframe is already loaded
    applyAnnotations();

    return () => {
      iframe.removeEventListener("load", applyAnnotations);
      // Clean up highlights from iframe DOM
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.getElementById("__annotation-styles")?.remove();
        doc.querySelectorAll(".__annotation-highlight").forEach((el) => {
          el.classList.remove("__annotation-highlight");
          el.removeAttribute("title");
        });
      }
    };
  }, [annotations]);

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
      </div>
    </div>
  );
}

export default PreviewComponent;
