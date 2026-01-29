import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import { useStore } from "../../store/store";

interface FeedbackPopupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type FormStep = "questions" | "calendar" | "thank_you";

interface FeedbackResponse {
  speaksEnglishFluently: boolean | null;
  hasTimeForCall: boolean | null;
}

const CAL_EMBED_URL = "https://cal.com/abi-raja/screenshot-to-code-feedback";

export function FeedbackPopupForm({
  open,
  onOpenChange,
  onComplete,
}: FeedbackPopupFormProps) {
  const [step, setStep] = useState<FormStep>("questions");
  const [responses, setResponses] = useState<FeedbackResponse>({
    speaksEnglishFluently: null,
    hasTimeForCall: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatedFetch = useAuthenticatedFetch();
  const subscriberTier = useStore((state) => state.subscriberTier);

  const isSubscriber = subscriberTier !== "" && subscriberTier !== "free";

  useEffect(() => {
    if (!open) {
      setStep("questions");
      setResponses({ speaksEnglishFluently: null, hasTimeForCall: null });
      setError(null);
    }
  }, [open]);

  const submitFeedbackResponse = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await authenticatedFetch(
        `${HTTP_BACKEND_URL}/feedback/call-interest`,
        "POST",
        {
          speaks_english_fluently: responses.speaksEnglishFluently,
          has_time_for_call: responses.hasTimeForCall,
        }
      );
    } catch (err) {
      console.error("Failed to submit feedback response:", err);
      setError("Failed to submit response. Please try again.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (
      responses.speaksEnglishFluently === null ||
      responses.hasTimeForCall === null
    ) {
      return;
    }

    try {
      await submitFeedbackResponse();

      if (
        isSubscriber &&
        responses.speaksEnglishFluently &&
        responses.hasTimeForCall
      ) {
        setStep("calendar");
      } else {
        setStep("thank_you");
      }
    } catch {
      // Error already set in submitFeedbackResponse
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (step === "calendar" || step === "thank_you") {
      onComplete();
    }
  };

  const renderQuestions = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="font-medium text-gray-900 dark:text-white">
          Do you speak English fluently?
        </p>
        <div className="flex gap-3">
          <Button
            variant={responses.speaksEnglishFluently === true ? "default" : "outline"}
            onClick={() =>
              setResponses((prev) => ({ ...prev, speaksEnglishFluently: true }))
            }
            className="flex-1"
          >
            Yes
          </Button>
          <Button
            variant={responses.speaksEnglishFluently === false ? "default" : "outline"}
            onClick={() =>
              setResponses((prev) => ({ ...prev, speaksEnglishFluently: false }))
            }
            className="flex-1"
          >
            No
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-medium text-gray-900 dark:text-white">
          Do you have time for a 30 min video call in the next few days?
        </p>
        <div className="flex gap-3">
          <Button
            variant={responses.hasTimeForCall === true ? "default" : "outline"}
            onClick={() =>
              setResponses((prev) => ({ ...prev, hasTimeForCall: true }))
            }
            className="flex-1"
          >
            Yes
          </Button>
          <Button
            variant={responses.hasTimeForCall === false ? "default" : "outline"}
            onClick={() =>
              setResponses((prev) => ({ ...prev, hasTimeForCall: false }))
            }
            className="flex-1"
          >
            No
          </Button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={
          responses.speaksEnglishFluently === null ||
          responses.hasTimeForCall === null ||
          isSubmitting
        }
        className="w-full"
      >
        {isSubmitting ? "Submitting..." : "Continue"}
      </Button>
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-300">
        Book a 30 minute feedback call to receive your $100 gift card.
      </p>
      <div className="border rounded-lg overflow-hidden bg-white">
        <iframe
          src={CAL_EMBED_URL}
          width="100%"
          height="500"
          frameBorder="0"
          title="Schedule feedback call"
        />
      </div>
      <Button variant="outline" onClick={handleClose} className="w-full">
        Done
      </Button>
    </div>
  );

  const renderThankYou = () => (
    <div className="space-y-4 text-center py-6">
      <div className="text-4xl">🙏</div>
      <p className="text-gray-600 dark:text-gray-300">
        Thank you for your response! We appreciate your feedback.
      </p>
      <Button onClick={handleClose} className="w-full">
        Close
      </Button>
    </div>
  );

  const getTitle = () => {
    switch (step) {
      case "questions":
        return "Get a $100 Gift Card";
      case "calendar":
        return "Book Your Feedback Call";
      case "thank_you":
        return "Thank You!";
    }
  };

  const getDescription = () => {
    switch (step) {
      case "questions":
        return "Help us improve by sharing your feedback in a 30-minute video call.";
      case "calendar":
        return "";
      case "thank_you":
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === "calendar" ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          {getDescription() && (
            <DialogDescription>{getDescription()}</DialogDescription>
          )}
        </DialogHeader>
        {step === "questions" && renderQuestions()}
        {step === "calendar" && renderCalendar()}
        {step === "thank_you" && renderThankYou()}
      </DialogContent>
    </Dialog>
  );
}
