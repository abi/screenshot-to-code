import { useUser } from "@clerk/clerk-react";
import posthog from "posthog-js";
import * as Sentry from "@sentry/react";
import App from "../../App";
import { useEffect, useRef } from "react";
import FullPageSpinner from "../core/FullPageSpinner";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch";
import { useStore } from "../../store/store";
import {
  LOGROCKET_APP_ID,
  GOOGLE_ADS_REGISTRATION_CONVERSION_SEND_TO,
  POSTHOG_HOST,
  POSTHOG_KEY,
  SAAS_BACKEND_URL,
} from "../../config";
import LogRocket from "logrocket";
import LandingPage from "./LandingPage";
import Intercom from "@intercom/messenger-js-sdk";
import { getExperimentGroup } from "../../lib/experiment";
import { applyHostedUserToStore, fetchHostedUser } from "./billingState";
import {
  addEvent,
  addGoogleAdsConversion,
  addTikTokEvent,
} from "../../lib/analytics";
import {
  getAttributionEventProps,
  shouldTrackSignupCompleted,
} from "../../lib/attribution";

function AppContainer() {
  const { isSignedIn, isLoaded } = useUser();

  const setExperimentGroup = useStore((state) => state.setExperimentGroup);
  const setFreeTrialUsage = useStore((state) => state.setFreeTrialUsage);

  // For fetching user
  const authenticatedFetch = useAuthenticatedFetch();
  const isInitRequestInProgress = useRef(false);

  // Get information from our backend about the user (subscription status)
  useEffect(() => {
    const init = async () => {
      // Make sure there's only one request in progress
      // so that we don't create multiple users
      if (isInitRequestInProgress.current) return;
      isInitRequestInProgress.current = true;

      const user = await fetchHostedUser(authenticatedFetch);

      // If the user is not signed in, authenticatedFetch will return undefined
      if (!user) {
        isInitRequestInProgress.current = false;
        return;
      }

      // Assign A/B test group for delayed paywall experiment
      const group = getExperimentGroup(user.email);
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      setExperimentGroup(group);

      // Load free-trial usage from the server BEFORE applying the user (which
      // sets subscriberTier === "free"). If we flipped the tier first, there'd
      // be a render window where the tier is "free" but freeTrialLimit is still
      // 0 → freeTrialRemaining is false → the onboarding paywall ("Liked what
      // you just built?") flashes before the start screen.
      if (!user.subscriber_tier && group === "delayed_paywall") {
        try {
          const usage = await authenticatedFetch(
            SAAS_BACKEND_URL + "/credits/free_trial_usage",
            "POST",
          );
          if (usage) {
            setFreeTrialUsage(usage.used, usage.limit);
          }
        } catch {
          // Non-critical; fall back to 0/0
        }
      }

      applyHostedUserToStore(user);

      if (shouldTrackSignupCompleted(user.email)) {
        const attributionProps = getAttributionEventProps();
        addEvent("Signup Completed", attributionProps);
        addTikTokEvent("CompleteRegistration", attributionProps);
        addGoogleAdsConversion(
          GOOGLE_ADS_REGISTRATION_CONVERSION_SEND_TO,
          {
            ...attributionProps,
            value: 1.0,
            currency: "USD",
          },
        );
      }

      if (user.subscriber_tier) {
        // Initialize Intercom only for paid users
        Intercom({
          app_id: "c5eiaj9m",
          user_id: user.email,
          name: fullName || undefined,
          email: user.email,
          "Subscriber Tier": user.subscriber_tier || "free",
          hide_default_launcher: true,
        });

        // Initialize PostHog only for paid users
        // and unmask all inputs except for passwords
        posthog.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          session_recording: {
            maskAllInputs: false,
            maskInputOptions: {
              password: true,
            },
          },
        });
        // Identify the user to PostHog
        posthog.identify(user.email, {
          email: user.email,
          first_name: firstName,
          last_name: lastName,
        });

        // Initialize LogRocket only for paid users
        if (LOGROCKET_APP_ID) {
          LogRocket.init(LOGROCKET_APP_ID);
          LogRocket.identify(user.email, {
            name: fullName,
            email: user.email,
            subscriberTier: user.subscriber_tier || "free",
          });
        }
      }

      // Identify user to Sentry
      Sentry.setUser({ email: user.email });

      isInitRequestInProgress.current = false;
    };

    init();
  }, [authenticatedFetch, setExperimentGroup, setFreeTrialUsage]);

  // If Clerk is still loading, show a spinner
  if (!isLoaded) return <FullPageSpinner />;

  // If the user is not signed in, show the landing page
  if (isLoaded && !isSignedIn) return <LandingPage />;

  // If the user is signed in, show the app
  return (
    <>
      <App />
    </>
  );
}

export default AppContainer;
