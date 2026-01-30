import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import { SAAS_BACKEND_URL } from "../../config";
import toast from "react-hot-toast";

type Answer = boolean | null;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriberTier: string | null;
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
      await authenticatedFetch(
        `${SAAS_BACKEND_URL}/feedback/submit`,
        "POST",
        {
          english_fluent: englishFluent,
          available_for_call: hasTimeForCall,
        }
      );
      setSubmitted(true);
    } catch (error) {
      toast.error("Failed to save your response. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCalEmbed = submitted && englishFluent === true && isSubscriber;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Get a $100 gift card for feedback
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/90 mt-2">
            We’re looking for a few users to share feedback on a 30‑minute call.
            After the call, you’ll receive $100 via Amazon gift card, PayPal, or
            another payment method of your choice.
          </p>
        </div>

        <div className="px-6 py-5 bg-white">
          {!submitted && (
            <div className="space-y-5">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900">
                  Do you speak English fluently?
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    className="w-24"
                    variant={englishFluent === true ? "default" : "secondary"}
                    onClick={() => setEnglishFluent(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    className="w-24"
                    variant={englishFluent === false ? "default" : "secondary"}
                    onClick={() => setEnglishFluent(false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-900">
                  Do you have time for a 30 min video call in the next few days?
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    className="w-24"
                    variant={hasTimeForCall === true ? "default" : "secondary"}
                    onClick={() => setHasTimeForCall(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    className="w-24"
                    variant={hasTimeForCall === false ? "default" : "secondary"}
                    onClick={() => setHasTimeForCall(false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Submit"}
                </Button>
              </div>
            </div>
          )}

          {submitted &&
            (englishFluent === false || hasTimeForCall === false) && (
              <div className="text-sm text-gray-700">
                Thanks for the response! It looks like this call isn’t the best
                fit right now.
              </div>
            )}

          {submitted &&
            !showCalEmbed &&
            englishFluent === true &&
            hasTimeForCall === true && (
              <div className="text-sm text-gray-700">
                Thanks for your response. We’ll reach out to schedule a call if
                it’s a good fit.
              </div>
            )}

          {showCalEmbed && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">Thanks! Book a time below.</p>
              <div className="w-full h-[560px] border rounded-md overflow-hidden">
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
