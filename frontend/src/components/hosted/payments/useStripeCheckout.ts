import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SAAS_BACKEND_URL, STRIPE_PUBLISHABLE_KEY } from "../../../config";
import { addEvent } from "../../../lib/analytics";
import { Stripe, loadStripe } from "@stripe/stripe-js";
import { useStore } from "../../../store/store";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import { captureBillingException } from "./billingSentry";

interface CreateCheckoutSessionResponse {
  sessionId: string;
}

export default function useStripeCheckout() {
  const authenticatedFetch = useAuthenticatedFetch();

  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const checkout = async (priceLookupKey: string) => {
    if (!stripe) {
      const billingState = useStore.getState();
      captureBillingException(new Error("Stripe has not finished loading"), {
        flow: "checkout",
        stage: "stripe_not_loaded",
        context: {
          price_lookup_key: priceLookupKey,
          subscriber_tier: billingState.subscriberTier,
          billing_interval: billingState.billingInterval,
        },
      });
      addEvent("StripeNotLoaded");
      return;
    }

    try {
      setIsLoadingCheckout(true);

      // Create a Checkout Session
      const res: CreateCheckoutSessionResponse = await authenticatedFetch(
        `${SAAS_BACKEND_URL}/payments/create_checkout_session` +
          `?price_lookup_key=${priceLookupKey}`,
        "POST"
      );

      // Track going to checkout page as a conversion
      gtag("event", "conversion", {
        send_to: "AW-16649848443/AKZpCJbP2cYZEPuMooM-",
      });

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: res.sessionId,
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (e) {
      const billingState = useStore.getState();
      captureBillingException(e, {
        flow: "checkout",
        stage: "redirect_to_checkout",
        context: {
          price_lookup_key: priceLookupKey,
          subscriber_tier: billingState.subscriberTier,
          billing_interval: billingState.billingInterval,
        },
      });
      toast.error("Error directing you to checkout. Please contact support.");
      addEvent("StripeCheckoutError");
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  // Load Stripe when the component mounts
  useEffect(() => {
    async function load() {
      try {
        setStripe(await loadStripe(STRIPE_PUBLISHABLE_KEY));
      } catch (e) {
        console.error(e);
        const billingState = useStore.getState();
        captureBillingException(e, {
          flow: "checkout",
          stage: "load_stripe",
          context: {
            subscriber_tier: billingState.subscriberTier,
            billing_interval: billingState.billingInterval,
          },
        });
        addEvent("StripeFailedToLoad");
      }
    }
    load();
  }, []);

  return { checkout, isLoadingCheckout };
}
