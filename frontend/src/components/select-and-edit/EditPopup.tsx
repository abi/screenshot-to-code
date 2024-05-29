import React, { useEffect, useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

function removeHighlight(element: HTMLElement) {
  element.style.outline = "";
  element.style.backgroundColor = "";
  return element;
}

interface EditPopupProps {
  event: MouseEvent | null;
  inSelectAndEditMode: boolean;
  doUpdate: (
    selectedUpdateInstruction?: string,
    selectedElement?: HTMLElement
  ) => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

const EditPopup: React.FC<EditPopupProps> = ({
  event,
  inSelectAndEditMode,
  doUpdate,
  iframeRef,
}) => {
  const [editText, setEditText] = useState("");
  const [selectedElement, setSelectedElement] = useState<
    HTMLElement | undefined
  >(undefined);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const inSelectAndEditModeRef = useRef(inSelectAndEditMode); // Create a ref for the state
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  function handleEditSubmit(editText: string) {
    doUpdate(
      editText,
      selectedElement ? removeHighlight(selectedElement) : selectedElement
    );
    setSelectedElement(undefined);
    setPopupVisible(false);
  }

  useEffect(() => {
    if (popupVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [popupVisible]);

  useEffect(() => {
    if (!popupVisible) {
      setEditText("");
    }
  }, [popupVisible, setEditText]);

  useEffect(() => {
    if (!inSelectAndEditMode) {
      if (selectedElement) removeHighlight(selectedElement);
      setSelectedElement(undefined);
      setPopupVisible(false);
    }
  }, [inSelectAndEditMode, selectedElement]);

  useEffect(() => {
    // Return if not in select and edit mode
    if (!inSelectAndEditModeRef.current || !event) {
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
  }, [event]);

  // Update the ref whenever the state changes
  useEffect(() => {
    inSelectAndEditModeRef.current = inSelectAndEditMode;
  }, [inSelectAndEditMode]);

  if (!popupVisible) return;

  return (
    <div
      className="absolute bg-white p-4 border border-gray-300 rounded shadow-lg w-60"
      style={{ top: popupPosition.y, left: popupPosition.x }}
    >
      <Textarea
        ref={textareaRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        placeholder="Tell the AI what to change about this element..."
      />
      <div className="flex justify-end mt-2">
        <Button onClick={() => handleEditSubmit(editText)}>Update</Button>
      </div>
    </div>
  );
};

export default EditPopup;
