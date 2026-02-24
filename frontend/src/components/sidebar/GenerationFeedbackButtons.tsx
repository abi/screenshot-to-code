import { LuThumbsDown, LuThumbsUp } from "react-icons/lu";

interface GenerationFeedbackButtonsProps {
  selectedValue: "up" | "down" | null;
  onSubmit: (value: "up" | "down") => Promise<void>;
}

export default function GenerationFeedbackButtons({
  selectedValue,
  onSubmit,
}: GenerationFeedbackButtonsProps) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => void onSubmit("up")}
        className={`rounded-lg border p-1.5 transition-colors ${
          selectedValue === "up"
            ? "border-green-500 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-900/20 dark:text-green-300"
            : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-zinc-800"
        }`}
        title="Great job"
      >
        <LuThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => void onSubmit("down")}
        className={`rounded-lg border p-1.5 transition-colors ${
          selectedValue === "down"
            ? "border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-900/20 dark:text-red-300"
            : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-zinc-800"
        }`}
        title="Bad job"
      >
        <LuThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
