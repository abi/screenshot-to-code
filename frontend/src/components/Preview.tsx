import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import useThrottle from "../hooks/useThrottle";
import EditPopup from "./select-and-edit/EditPopup";

interface Props {
  code: string;
  device: "mobile" | "desktop";
  doUpdate: (
    selectedUpdateInstruction?: string,
    selectedElement?: HTMLElement
  ) => void;
  inSelectAndEditMode: boolean;
}

function Preview({ code, device, doUpdate, inSelectAndEditMode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Don't update code more often than every 200ms.
  const throttledCode = useThrottle(code, 200);

  const inSelectAndEditModeRef = useRef(inSelectAndEditMode); // Create a ref for the state

  const [selectedElement, setSelectedElement] = useState<
    HTMLElement | undefined
  >(undefined);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  function removeHighlight(element: HTMLElement) {
    element.style.outline = "";
    element.style.backgroundColor = "";
    return element;
  }

  function updateHighlight(targetElement: HTMLElement) {
    setSelectedElement((prev) => {
      // Remove style from previous element
      if (prev) {
        removeHighlight(prev);
      }
      // Add style to new element
      targetElement.style.outline = "2px dashed #1846db";
      targetElement.style.backgroundColor = "#bfcbf5";
      return targetElement;
    });
  }

  function handleClick(event: MouseEvent) {
    // Return if not in select and edit mode
    if (!inSelectAndEditModeRef.current) {
      return;
    }

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

    // Show popup at click position, slightly offset to be right under the cursor
    setPopupVisible(false);

    // Calculate offsets
    const rect = iframeRef.current?.getBoundingClientRect();
    const offsetX = rect ? rect.left : 0;
    const offsetY = rect ? rect.top : 0;

    // Adjust for scale
    const scale = 1; // the scale factor applied to the iframe
    const scaledX = clientX / scale + offsetX;
    const scaledY = clientY / scale + offsetY;

    setPopupPosition({ x: scaledX, y: scaledY });
    setPopupVisible(true);
  }

  function handleEditSubmit(editText: string) {
    doUpdate(
      editText,
      selectedElement ? removeHighlight(selectedElement) : selectedElement
    );
    setSelectedElement(undefined);
    setPopupVisible(false);
  }

  useEffect(() => {
    if (!inSelectAndEditMode) {
      if (selectedElement) removeHighlight(selectedElement);
      setSelectedElement(undefined);
      setPopupVisible(false);
    }
  }, [inSelectAndEditMode, selectedElement]);

  // Update the ref whenever the state changes
  useEffect(() => {
    inSelectAndEditModeRef.current = inSelectAndEditMode;
  }, [inSelectAndEditMode]);

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
          handleEditSubmit,
        }}
      />
    </div>
  );
}

export default Preview;
