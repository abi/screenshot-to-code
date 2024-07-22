import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SAAS_BACKEND_URL, STRIPE_PUBLISHABLE_KEY } from "../../../config";
import { addEvent } from "../../../lib/analytics";
import { Stripe, loadStripe } from "@stripe/stripe-js";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";

interface CreateCheckoutSessionResponse {
  sessionId: string;
}

export default function useStripeCheckout() {
  const authenticatedFetch = useAuthenticatedFetch();

  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const checkout = async (priceLookupKey: string) => {
    const rewardfulReferralId = "xxx"; // TODO: Use later with Rewardful

    if (!stripe) {
      addEvent("StripeNotLoaded");
      return;
    }

    try {
      setIsLoadingCheckout(true);

      // Create a Checkout Session
      const res: CreateCheckoutSessionResponse = await authenticatedFetch(
        `${SAAS_BACKEND_URL}/payments/create_checkout_session` +
          `?price_lookup_key=${priceLookupKey}` +
          `&rewardful_referral_id=${rewardfulReferralId}`,
        "POST"
      );

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: res.sessionId,
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (e) {
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
        addEvent("StripeFailedToLoad");
      }
    }
    load();
  }, []);

  return { checkout, isLoadingCheckout };
}
