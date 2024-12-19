import { useEffect, useRef, useState } from "react";
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

  // Add scaling logic
  useEffect(() => {
    const updateScale = () => {
      const wrapper = wrapperRef.current;
      const iframe = iframeRef.current;
      if (!wrapper || !iframe) return;

      const viewportWidth = wrapper.clientWidth;
      const baseWidth = device === "desktop" ? 1440 : 375;
      const scale = Math.min(1, viewportWidth / baseWidth);

      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = "top left";
      // Adjust wrapper height to account for scaling
      wrapper.style.height = `${iframe.offsetHeight * scale}px`;
    };

    updateScale();

    // Add event listener for window resize
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [device]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = throttledCode;

      // Set up click handler for select and edit funtionality
      iframe.addEventListener("load", function () {
        iframe.contentWindow?.document.body.addEventListener(
          "click",
          setClickEvent
        );
      });
    }
  }, [throttledCode]);

  return (
    <div className="flex justify-center mr-4">
      <div
        ref={wrapperRef}
        className="overflow-y-auto overflow-x-hidden w-full"
      >
        <iframe
          id={`preview-${device}`}
          ref={iframeRef}
          title="Preview"
          className={classNames(
            "border-[4px] border-black rounded-[20px] shadow-lg mx-auto",
            {
              "w-[1440px] h-[900px]": device === "desktop",
              "w-[375px] h-[812px]": device === "mobile",
            }
          )}
        ></iframe>
        <EditPopup
          event={clickEvent}
          iframeRef={iframeRef}
          doUpdate={doUpdate}
        />
      </div>
    </div>
  );
}

export default PreviewComponent;
