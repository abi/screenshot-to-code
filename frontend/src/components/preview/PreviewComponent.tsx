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

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  // Select and edit functionality
  const [clickEvent, setClickEvent] = useState<MouseEvent | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = throttledCode;

      // Set up click handler for select and edit functionality
      iframe.addEventListener("load", function () {
        iframe.contentWindow?.document.body.addEventListener(
          "click",
          setClickEvent
        );
      });
    }
  }, [throttledCode]);

  return (
    <div className="flex justify-center mx-2">
      <iframe
        id={`preview-${device}`}
        ref={iframeRef}
        title="Preview"
        className={classNames(
          "border-[4px] border-black rounded-[20px] shadow-lg",
          "transform scale-[0.9] origin-top",
          {
            "w-full h-[832px]": device === "desktop",
            "w-[400px] h-[832px]": device === "mobile",
          }
        )}
      ></iframe>
      <EditPopup event={clickEvent} iframeRef={iframeRef} doUpdate={doUpdate} />
    </div>
  );
}

export default PreviewComponent;
