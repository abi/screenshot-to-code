import { IoClose } from "react-icons/io5";

interface FeedbackBannerProps {
  onDismiss: () => void;
  formUrl: string;
}

export function FeedbackBanner({ onDismiss, formUrl }: FeedbackBannerProps) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-lg mb-4 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🎁</span>
          <p className="text-sm font-medium">
            Get a <span className="font-bold">$100 gift card</span> for 30 min
            of feedback
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-purple-700 px-3 py-1 rounded-md text-sm font-semibold hover:bg-purple-50 transition-colors"
          >
            Join
          </a>
          <button
            onClick={onDismiss}
            className="text-white/80 hover:text-white p-1 transition-colors"
            aria-label="Dismiss"
          >
            <IoClose size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
