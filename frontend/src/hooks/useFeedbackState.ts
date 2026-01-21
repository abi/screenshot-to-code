import { useCallback } from "react";
import { usePersistedState } from "./usePersistedState";

interface FeedbackState {
  successfulGenerations: number;
  bannerDismissed: boolean;
}

const STORAGE_KEY = "feedbackState";

export function useFeedbackState() {
  const [state, setState] = usePersistedState<FeedbackState>(
    {
      successfulGenerations: 0,
      bannerDismissed: false,
    },
    STORAGE_KEY
  );

  const incrementGenerations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      successfulGenerations: prev.successfulGenerations + 1,
    }));
  }, [setState]);

  const dismissBanner = useCallback(() => {
    setState((prev) => ({
      ...prev,
      bannerDismissed: true,
    }));
  }, [setState]);

  const shouldShowBanner =
    state.successfulGenerations >= 1 && !state.bannerDismissed;

  return {
    successfulGenerations: state.successfulGenerations,
    bannerDismissed: state.bannerDismissed,
    shouldShowBanner,
    incrementGenerations,
    dismissBanner,
  };
}
