import React, { useEffect, useRef } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

interface EditPopupProps {
  popupVisible: boolean;
  popupPosition: { x: number; y: number };
  editText: string;
  setEditText: (text: string) => void;
  handleEditSubmit: () => void;
}

const EditPopup: React.FC<EditPopupProps> = ({
  popupVisible,
  popupPosition,
  editText,
  setEditText,
  handleEditSubmit,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (popupVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [popupVisible]);

  //   useEffect(() => {
  //     if (!popupVisible) {
  //       setEditText("");
  //     }
  //   }, [popupVisible, setEditText]);

  return (
    <div
      className="absolute bg-white p-4 border border-gray-300 rounded shadow-lg"
      style={{ top: popupPosition.y, left: popupPosition.x }}
    >
      <Textarea
        ref={textareaRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        placeholder="Edit text"
      />
      <Button onClick={handleEditSubmit} className="mt-2">
        Submit
      </Button>
    </div>
  );
};

export default EditPopup;
