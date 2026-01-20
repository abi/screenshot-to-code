import { FaGift } from "react-icons/fa";

interface FeedbackFABProps {
  formUrl: string;
}

export function FeedbackFAB({ formUrl }: FeedbackFABProps) {
  return (
    <a
      href={formUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-purple-600 p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 group"
      title="Get $100 for feedback"
    >
      <FaGift size={20} />
      <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Get $100 for feedback
      </span>
    </a>
  );
}
