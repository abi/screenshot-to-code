import { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../../hooks/useThrottle";
import EditPopup from "../select-and-edit/EditPopup";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  doUpdate: (updateInstruction: string, selectedElement?: HTMLElement) => void;
}

function PreviewComponent({ code, device, doUpdate }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  // Select and edit functionality
  const [clickEvent, setClickEvent] = useState<MouseEvent | null>(null);
  const [scale, setScale] = useState(1);
  const handleIframeClick = useCallback((event: MouseEvent) => {
    setClickEvent(event);
  }, []);

  // Add scaling logic (only for mobile - desktop fills the space)
  useEffect(() => {
    if (device === "desktop") {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.style.transform = "";
        iframe.style.transformOrigin = "";
      }
      setScale(1);
      return;
    }

    const updateScale = () => {
      const wrapper = wrapperRef.current;
      const iframe = iframeRef.current;
      if (!wrapper || !iframe) return;

      const viewportWidth = wrapper.clientWidth;
      const viewportHeight = wrapper.clientHeight;
      const baseWidth = 375;
      const baseHeight = 812;
      const scaleValue = Math.min(1, viewportWidth / baseWidth, viewportHeight / baseHeight);

      setScale(scaleValue);

      iframe.style.transform = `scale(${scaleValue})`;
      iframe.style.transformOrigin = "top left";
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [device]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const body = iframe.contentWindow?.document.body;
      if (!body) return;
      body.addEventListener("click", handleIframeClick);
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      const body = iframe.contentWindow?.document.body;
      if (body) {
        body.removeEventListener("click", handleIframeClick);
      }
    };
  }, [handleIframeClick]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (iframe.srcdoc !== throttledCode) {
      iframe.srcdoc = throttledCode;
    }
  }, [throttledCode]);

  return (
    <div className={`flex-1 min-h-0 relative overflow-hidden ${device === "mobile" ? "flex justify-center bg-gray-100 dark:bg-zinc-900" : ""}`}>
      <div
        ref={wrapperRef}
        className="w-full h-full"
      >
        <iframe
          id={`preview-${device}`}
          ref={iframeRef}
          title="Preview"
          className={classNames(
            {
              "w-full h-full": device === "desktop",
              "w-[375px] h-[812px]": device === "mobile",
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
