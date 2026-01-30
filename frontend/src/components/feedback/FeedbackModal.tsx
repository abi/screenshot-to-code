import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import { SAAS_BACKEND_URL } from "../../config";
import toast from "react-hot-toast";
import {
  FiGift,
  FiMessageCircle,
  FiGlobe,
  FiCalendar,
  FiCheck,
} from "react-icons/fi";

type Answer = boolean | null;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriberTier: string | null;
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
  subscriberTier,
}: FeedbackModalProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [englishFluent, setEnglishFluent] = useState<Answer>(null);
  const [hasTimeForCall, setHasTimeForCall] = useState<Answer>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isSubscriber = useMemo(
    () => !!subscriberTier && subscriberTier !== "free",
    [subscriberTier]
  );

  useEffect(() => {
    if (!open) {
      setEnglishFluent(null);
      setHasTimeForCall(null);
      setIsSubmitting(false);
      setSubmitted(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (englishFluent === null || hasTimeForCall === null) {
      toast.error("Please answer both questions.");
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
        available_for_call: hasTimeForCall,
      });
      setSubmitted(true);
    } catch (error) {
      toast.error("Failed to save your response. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCalEmbed =
    submitted &&
    englishFluent === true &&
    hasTimeForCall === true &&
    isSubscriber;
  const canSubmit = englishFluent !== null && hasTimeForCall !== null;

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
              Get a $100 gift card
            </h2>
            <p className="text-emerald-100/80 mt-2 text-sm leading-relaxed max-w-md">
              Share your feedback in a 30-minute call and receive $100 via
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

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FiCalendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium mb-3">
                    Available for a 30-min video call this week?
                  </p>
                  <div className="flex gap-2">
                    <ToggleButton
                      selected={hasTimeForCall === true}
                      onClick={() => setHasTimeForCall(true)}
                    >
                      Yes
                    </ToggleButton>
                    <ToggleButton
                      selected={hasTimeForCall === false}
                      onClick={() => setHasTimeForCall(false)}
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
            (englishFluent === false || hasTimeForCall === false) && (
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

          {submitted &&
            !showCalEmbed &&
            englishFluent === true &&
            hasTimeForCall === true && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-gray-600 text-sm">
                  Thanks for your interest! We'll reach out soon if it's a good
                  fit.
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
