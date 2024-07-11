import React from "react";
import { BsArrowReturnLeft } from "react-icons/bs";

interface KeyboardShortcutBadgeProps {
  letter: string;
}

const KeyboardShortcutBadge: React.FC<KeyboardShortcutBadgeProps> = ({
  letter,
}) => {
  const icon =
    letter.toLowerCase() === "enter" || letter.toLowerCase() === "return" ? (
      <BsArrowReturnLeft />
    ) : (
      letter.toUpperCase()
    );

  return (
    <span className="font-mono text-xs ml-2 rounded bg-gray-700 dark:bg-gray-900 text-white py-[2px] px-2">
      {icon}
    </span>
  );
};

export default KeyboardShortcutBadge;
