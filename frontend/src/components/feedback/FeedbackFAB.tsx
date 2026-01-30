import { FaGift } from "react-icons/fa";

interface FeedbackFABProps {
  onOpen: () => void;
}

export function FeedbackFAB({ onOpen }: FeedbackFABProps) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-20 right-6 z-[9999] bg-purple-100 hover:bg-purple-200 text-purple-600 hover:text-purple-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group border border-purple-200"
      title="Get $100 for feedback"
    >
      <FaGift size={20} />
      <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Get $100 for feedback
      </span>
    </button>
  );
}
