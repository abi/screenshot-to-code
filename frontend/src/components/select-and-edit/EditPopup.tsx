import React, { useEffect, useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

interface EditPopupProps {
  popupVisible: boolean;
  popupPosition: { x: number; y: number };
  handleEditSubmit: (editText: string) => void;
}

const EditPopup: React.FC<EditPopupProps> = ({
  popupVisible,
  popupPosition,
  handleEditSubmit,
}) => {
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
