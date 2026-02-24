import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { SAAS_BACKEND_URL, IS_RUNNING_ON_CLOUD } from "../config";
import { useProjectStore } from "../store/project-store";

export function useGenerationFeedback() {
  const { getToken } = useAuth();
  const { head, commits, setCommitFeedback } = useProjectStore();

  const submitGenerationFeedback = async (value: "up" | "down") => {
    if (!IS_RUNNING_ON_CLOUD || !SAAS_BACKEND_URL || !head) {
      return;
    }

    const commit = commits[head];
    if (!commit || commit.type !== "ai_create") {
      return;
    }

    const optionIndex = commit.selectedVariantIndex;
    const generationId = commit.variants[optionIndex]?.generationId;
    if (!generationId) {
      toast.error("Feedback is not ready yet. Try again in a moment.");
      return;
    }
    const authToken = await getToken();
    if (!authToken) {
      toast.error("Unable to submit feedback right now.");
      return;
    }

    const response = await fetch(`${SAAS_BACKEND_URL}/generations/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        generation_id: generationId,
        feedback: value,
      }),
    });

    if (!response.ok) {
      toast.error("Failed to save feedback. Please try again.");
      return;
    }

    setCommitFeedback(commit.hash, {
      value,
      optionIndex,
      submittedAt: Date.now(),
    });
  };

  return { submitGenerationFeedback };
}
