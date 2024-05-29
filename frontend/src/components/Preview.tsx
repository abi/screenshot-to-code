import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../hooks/useThrottle";
import EditPopup from "./select-and-edit/EditPopup";

interface Props {
  code: string;
  device: "mobile" | "desktop";
}

function Preview({ code, device }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
    null
  );
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [editText, setEditText] = useState("");

  console.log(selectedElement);

  function updateHighlight(targetElement: HTMLElement) {
    setSelectedElement((prev) => {
      // Remove style from previous element
      if (prev) {
        prev.style.outline = "";
        prev.style.backgroundColor = "";
      }
      // Add style to new element
      targetElement.style.outline = "2px dashed #1846db";
      targetElement.style.backgroundColor = "#bfcbf5";
      return targetElement;
    });
  }

  function handleClick(event: MouseEvent) {
    const { clientX, clientY } = event;

    // Prevent default to avoid issues like label clicks triggering textareas, etc.
    event.preventDefault();

    const targetElement = event.target as HTMLElement;

    // Return if no target element
    if (!targetElement) {
      return;
    }

    // Highlight the selected element
    updateHighlight(targetElement);

    // Show popup at click position
    setPopupVisible(false);
    setPopupPosition({ x: clientX, y: clientY });
    setPopupVisible(true);
  }

  function handleEditSubmit() {
    if (selectedElement) {
      selectedElement.innerText = editText;
    }
    setPopupVisible(false);
  }

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = throttledCode;

      // Related to
      iframe.addEventListener("load", function () {
        iframe.contentWindow?.document.body.addEventListener(
          "click",
          handleClick
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
      <EditPopup
        {...{
          popupVisible,
          popupPosition,
          editText,
          setEditText,
          handleEditSubmit,
        }}
      />
    </div>
  );
}

export default Preview;
