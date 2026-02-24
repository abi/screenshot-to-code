import { LuThumbsDown, LuThumbsUp } from "react-icons/lu";
import { useState } from "react";

interface GenerationFeedbackButtonsProps {
  selectedValue: "up" | "down" | null;
  onSubmit: (value: "up" | "down") => Promise<boolean>;
}

export default function GenerationFeedbackButtons({
  selectedValue,
  onSubmit,
}: GenerationFeedbackButtonsProps) {
  const [showThanks, setShowThanks] = useState(false);

  const handleSubmit = async (value: "up" | "down") => {
    const ok = await onSubmit(value);
    if (!ok) return;
    setShowThanks(true);
    window.setTimeout(() => {
      setShowThanks(false);
    }, 2000);
  };

  return (
    <div className="flex items-center gap-2">
      {showThanks && (
        <span className="text-xs text-gray-500 dark:text-gray-400 animate-in fade-in duration-300">
          Thanks for your feedback!
        </span>
      )}
      <button
        onClick={() => void handleSubmit("up")}
        className={`flex items-center justify-center rounded-lg border p-1.5 transition-colors ${
          selectedValue === "up"
            ? "border-green-500 bg-green-50 text-green-600 dark:border-green-500/50 dark:bg-green-500/10 dark:text-green-400"
            : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-zinc-800"
        }`}
        title="Good generation"
      >
        <LuThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => void handleSubmit("down")}
        className={`flex items-center justify-center rounded-lg border p-1.5 transition-colors ${
          selectedValue === "down"
            ? "border-red-500 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-400"
            : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-zinc-800"
        }`}
        title="Poor generation"
      >
        <LuThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
