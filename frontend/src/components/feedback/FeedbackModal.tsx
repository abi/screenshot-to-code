import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import {
  SAAS_BACKEND_URL,
  SHOULD_SHOW_FEEDBACK_CALL_UI,
} from "../../config";
import toast from "react-hot-toast";
import {
  FiGift,
  FiMessageCircle,
  FiGlobe,
  FiCheck,
} from "react-icons/fi";

type Answer = boolean | null;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ToggleButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToggleButton({ selected, onClick, children }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150
        ${
          selected
            ? "bg-emerald-600 text-white"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
        }
      `}
    >
      {selected && <FiCheck className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />}
      {children}
    </button>
  );
}

export function FeedbackModal({
  open,
  onOpenChange,
}: FeedbackModalProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [englishFluent, setEnglishFluent] = useState<Answer>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const rewardAmount = 100;

  useEffect(() => {
    if (!open) {
      setEnglishFluent(null);
      setIsSubmitting(false);
      setSubmitted(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!SHOULD_SHOW_FEEDBACK_CALL_UI) {
      toast.error("Feedback calls are currently unavailable.");
      return;
    }
    if (englishFluent === null) {
      toast.error("Please answer the question.");
      return;
    }
    if (!SAAS_BACKEND_URL) {
      toast.error("Feedback service is unavailable.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authenticatedFetch(`${SAAS_BACKEND_URL}/feedback/submit`, "POST", {
        english_fluent: englishFluent,
        available_for_call: true,
      });
      setSubmitted(true);
    } catch (error) {
      toast.error("Failed to save your response. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCalEmbed = submitted && englishFluent === true;
  const canSubmit = englishFluent !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="relative bg-emerald-700 text-white px-8 py-8">
          <div className="absolute top-6 right-6 opacity-10">
            <FiGift className="w-20 h-20" strokeWidth={1.5} />
          </div>
          <div className="relative">
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wider mb-2">
              User Research
            </p>
            <h2 className="text-2xl font-semibold">
              Get a ${rewardAmount} gift card
            </h2>
            <p className="text-emerald-100/80 mt-2 text-sm leading-relaxed max-w-md">
              Share your feedback in a 30-minute call and receive ${rewardAmount} via
              Amazon, PayPal, or your preferred payment method.
            </p>
          </div>
        </div>

        <div className="px-8 py-6 bg-white">
          {!submitted && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FiGlobe className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium mb-3">
                    Do you speak English fluently?
                  </p>
                  <div className="flex gap-2">
                    <ToggleButton
                      selected={englishFluent === true}
                      onClick={() => setEnglishFluent(true)}
                    >
                      Yes
                    </ToggleButton>
                    <ToggleButton
                      selected={englishFluent === false}
                      onClick={() => setEnglishFluent(false)}
                    >
                      No
                    </ToggleButton>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                className={`
                  w-full py-3 rounded-lg font-medium text-sm
                  transition-all duration-150
                  ${
                    canSubmit
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {isSubmitting ? "Submitting..." : "Continue"}
              </button>
            </div>
          )}

          {submitted &&
            englishFluent === false && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FiMessageCircle className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-gray-600 text-sm">
                  Thanks for your response! This opportunity isn't the right fit
                  at the moment, but we appreciate your time.
                </p>
              </div>
            )}

          {showCalEmbed && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-gray-600 text-sm">
                  Great! Pick a time that works for you.
                </p>
              </div>
              <div className="w-full h-[560px] border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src="https://cal.com/abi-raja-wy2pfh/15-min-screenshot-to-code-feedback-session?embed=1"
                  className="w-full h-full"
                  title="Book a feedback call"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
