import React, { useEffect, useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { addHighlight, getAdjustedCoordinates, removeHighlight } from "./utils";
import { useAppStore } from "../../store/app-store";
import KeyboardShortcutBadge from "../core/KeyboardShortcutBadge";

interface EditPopupProps {
  event: MouseEvent | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  doUpdate: (updateInstruction: string, selectedElement?: HTMLElement) => void;
}

const EditPopup: React.FC<EditPopupProps> = ({
  event,
  iframeRef,
  doUpdate,
}) => {
  // App state
  const { inSelectAndEditMode } = useAppStore();

  // Create a wrapper ref to store inSelectAndEditMode so the value is not stale
  // in a event listener
  const inSelectAndEditModeRef = useRef(inSelectAndEditMode);

  // Update the ref whenever the state changes
  useEffect(() => {
    inSelectAndEditModeRef.current = inSelectAndEditMode;
  }, [inSelectAndEditMode]);

  // Popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Edit state
  const [selectedElement, setSelectedElement] = useState<
    HTMLElement | undefined
  >(undefined);
  const [updateText, setUpdateText] = useState("");

  // Textarea ref for focusing
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function onUpdate(updateText: string) {
    // Perform the update
    doUpdate(
      updateText,
      selectedElement ? removeHighlight(selectedElement) : selectedElement
    );

    // Unselect the element
    setSelectedElement(undefined);

    // Hide the popup
    setPopupVisible(false);
  }

  // Remove highlight and reset state when not in select and edit mode
  useEffect(() => {
    if (!inSelectAndEditMode) {
      if (selectedElement) removeHighlight(selectedElement);
      setSelectedElement(undefined);
      setPopupVisible(false);
    }
  }, [inSelectAndEditMode, selectedElement]);

  // Handle the click event
  useEffect(() => {
    // Return if not in select and edit mode
    if (!inSelectAndEditModeRef.current || !event) {
      return;
    }

    // Prevent default to avoid issues like label clicks triggering textareas, etc.
    event.preventDefault();

    const targetElement = event.target as HTMLElement;

    // Return if no target element
    if (!targetElement) return;

    // Highlight and set the selected element
    setSelectedElement((prev) => {
      // Remove style from previous element
      if (prev) {
        removeHighlight(prev);
      }
      return addHighlight(targetElement);
    });

    // Calculate adjusted coordinates
    const adjustedCoordinates = getAdjustedCoordinates(
      event.clientX,
      event.clientY,
      iframeRef.current?.getBoundingClientRect()
    );

    // Show the popup at the click position
    setPopupVisible(true);
    setPopupPosition({ x: adjustedCoordinates.x, y: adjustedCoordinates.y });

    // Reset the update text
    setUpdateText("");

    // Focus the textarea
    textareaRef.current?.focus();
  }, [event, iframeRef]);

  // Focus the textarea when the popup is visible (we can't do this only when handling the click event
  // because the textarea is not rendered yet)
  // We need to also do it in the click event because popupVisible doesn't change values in that event
  useEffect(() => {
    if (popupVisible) {
      textareaRef.current?.focus();
    }
  }, [popupVisible]);

  if (!popupVisible) return;

  return (
    <div
      className="absolute bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-600 rounded shadow-lg w-60"
      style={{ top: popupPosition.y, left: popupPosition.x }}
    >
      <Textarea
        ref={textareaRef}
        value={updateText}
        onChange={(e) => setUpdateText(e.target.value)}
        placeholder="Tell the AI what to change about this element..."
        className="dark:bg-gray-700 dark:text-white"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onUpdate(updateText);
          }
        }}
      />
      <div className="flex justify-end mt-2">
        <Button
          className="dark:bg-gray-700 dark:text-white"
          onClick={() => onUpdate(updateText)}
        >
          Update <KeyboardShortcutBadge letter="enter" />
        </Button>
      </div>
    </div>
  );
};

export default EditPopup;
