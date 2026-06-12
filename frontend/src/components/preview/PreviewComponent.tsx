import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../../hooks/useThrottle";
import { useAppStore } from "../../store/app-store";
import {
  applySelectModeCursor,
  hideHoverOverlay,
  hideSelectionOverlay,
  removeHoverOverlay,
  removeSelectModeCursor,
  removeSelectionOverlay,
  showHoverOverlay,
  showSelectionOverlay,
} from "../select-and-edit/overlays";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  onScaleChange?: (scale: number) => void;
  viewMode?: "fit" | "actual";
}

const MOBILE_VIEWPORT_WIDTH = 375;
export const DESKTOP_VIEWPORT_WIDTH = 1366;

function PreviewComponent({
  code,
  device,
  onScaleChange,
  viewMode,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  // Select and edit functionality
  const [clickEvent, setClickEvent] = useState<MouseEvent | null>(null);
  const activeMode = viewMode ?? "fit";

  // In select-and-edit mode, intercept clicks in the capture phase so the
  // generated app's own handlers (React/Vue listeners, Bootstrap/Ionic
  // behaviors, link navigation, form submits) never fire while selecting.
  const handleIframeClick = useCallback((event: MouseEvent) => {
    if (!inSelectAndEditModeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setClickEvent(event);
  }, []);

  // Suppress the rest of the pointer sequence (and form submits) while
  // selecting, since app handlers can be bound to those events too.
  const handleIframeInteraction = useCallback((event: Event) => {
    if (!inSelectAndEditModeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleIframeLinkClick = useCallback((event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest?.("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (href && href.startsWith("#")) {
      event.preventDefault();
    }
  }, []);

  // Devtools-style hover ring while selecting
  const hoveredElementRef = useRef<HTMLElement | null>(null);

  const handleIframeMouseOver = useCallback((event: MouseEvent) => {
    if (!inSelectAndEditModeRef.current) return;
    const target = event.target as HTMLElement;
    if (!target || !target.getBoundingClientRect) return;
    hoveredElementRef.current = target;
    showHoverOverlay(target);
  }, []);

  const handleIframeMouseOut = useCallback((event: MouseEvent) => {
    if (!inSelectAndEditModeRef.current) return;
    // Only when the pointer leaves the iframe viewport entirely
    if (event.relatedTarget) return;
    hoveredElementRef.current = null;
    hideHoverOverlay((event.target as HTMLElement)?.ownerDocument);
  }, []);

  // Keep the rings glued to their elements while the page scrolls or
  // resizes under a stationary cursor.
  const handleIframeReposition = useCallback(() => {
    if (!inSelectAndEditModeRef.current) return;
    const hovered = hoveredElementRef.current;
    if (hovered && hovered.isConnected) {
      showHoverOverlay(hovered);
    }
    const selected = useAppStore.getState().selectedElement;
    if (selected && selected.isConnected) {
      showSelectionOverlay(selected);
    }
  }, []);

  // Escape exits select mode even when focus is inside the iframe.
  const handleIframeKeyDown = useCallback((event: KeyboardEvent) => {
    if (!inSelectAndEditModeRef.current) return;
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    useAppStore.getState().disableInSelectAndEditMode();
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

    const targetElement = clickEvent.target as HTMLElement;
    if (!targetElement) return;

    setSelectedElement(targetElement);
  }, [clickEvent, setSelectedElement]);

  // Render the selection ring for whatever element is currently selected
  // (clearing it when the selection is cleared from anywhere, e.g. the
  // sidebar's X button or after submitting an edit).
  useEffect(() => {
    if (selectedElement && selectedElement.isConnected) {
      showSelectionOverlay(selectedElement);
      return;
    }
    hideSelectionOverlay(iframeRef.current?.contentWindow?.document);
  }, [selectedElement]);

  // Apply/remove select-mode side effects (cursor, hover and selection
  // rings) when the mode toggles.
  useEffect(() => {
    const doc = iframeRef.current?.contentWindow?.document;
    if (inSelectAndEditMode) {
      applySelectModeCursor(doc);
      return;
    }
    if (selectedElement) {
      setSelectedElement(null);
    }
    hoveredElementRef.current = null;
    removeHoverOverlay(doc);
    removeSelectionOverlay(doc);
    removeSelectModeCursor(doc);
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

    const suppressedEvents = ["pointerdown", "mousedown", "mouseup", "submit"];

    const handleLoad = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      // Intercept on the window in the capture phase: the window is the
      // first node in the propagation path, so this runs before any handler
      // the generated app registered, including capture-phase delegated
      // handlers on document (e.g. Bootstrap's data API).
      win.addEventListener("click", handleIframeClick, true);
      for (const type of suppressedEvents) {
        win.addEventListener(type, handleIframeInteraction, true);
      }
      win.addEventListener("mouseover", handleIframeMouseOver, true);
      win.addEventListener("mouseout", handleIframeMouseOut, true);
      win.addEventListener("scroll", handleIframeReposition, true);
      win.addEventListener("resize", handleIframeReposition);
      win.addEventListener("keydown", handleIframeKeyDown, true);
      win.document.addEventListener("click", handleIframeLinkClick);
      // A reload replaces the document, so re-apply mode side effects.
      if (inSelectAndEditModeRef.current) {
        applySelectModeCursor(win.document);
      }
    };

    iframe.addEventListener("load", handleLoad);
    // The current document may already be loaded (e.g. the component
    // re-rendered after the iframe's load event); attach to it directly.
    // addEventListener dedupes identical handlers, so this is safe.
    if (iframe.contentWindow?.document.readyState === "complete") {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener("load", handleLoad);
      const win = iframe.contentWindow;
      if (win) {
        win.removeEventListener("click", handleIframeClick, true);
        for (const type of suppressedEvents) {
          win.removeEventListener(type, handleIframeInteraction, true);
        }
        win.removeEventListener("mouseover", handleIframeMouseOver, true);
        win.removeEventListener("mouseout", handleIframeMouseOut, true);
        win.removeEventListener("scroll", handleIframeReposition, true);
        win.removeEventListener("resize", handleIframeReposition);
        win.removeEventListener("keydown", handleIframeKeyDown, true);
        win.document.removeEventListener("click", handleIframeLinkClick);
      }
    };
  }, [
    handleIframeClick,
    handleIframeLinkClick,
    handleIframeInteraction,
    handleIframeMouseOver,
    handleIframeMouseOut,
    handleIframeReposition,
    handleIframeKeyDown,
  ]);

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
      </div>
    </div>
  );
}

export default PreviewComponent;
