import { useState } from "react";
import toast from "react-hot-toast";
import { SAAS_BACKEND_URL } from "../../../config";
import { addEvent } from "../../../lib/analytics";
import { useStore } from "../../../store/store";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import {
  CreatePortalSessionRequest,
  PortalSessionResponse,
} from "../types";
import { captureBillingException } from "./billingSentry";

const GENERIC_PORTAL_ERROR_MESSAGE =
  "Error directing you to the billing portal. Please contact support.";

export default function useStripePortal() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const openPortal = async (
    payload: CreatePortalSessionRequest,
    errorMessage?: string,
  ) => {
    try {
      setIsLoadingPortal(true);
      const response = await authenticatedFetch(
        SAAS_BACKEND_URL + "/payments/create_portal_session",
        "POST",
        payload,
      );
      const portalSession = response as PortalSessionResponse;
      window.location.assign(portalSession.url);
      return true;
    } catch (error) {
      const billingState = useStore.getState();
      captureBillingException(error, {
        flow: "portal",
        stage: "create_portal_session",
        context: {
          action: payload.action,
          target_tier: payload.target_tier,
          price_lookup_key: billingState.currentPriceLookupKey,
          subscriber_tier: billingState.subscriberTier,
          billing_interval: billingState.billingInterval,
        },
      });
      toast.error(
        errorMessage
          || (error instanceof Error && error.message)
          || GENERIC_PORTAL_ERROR_MESSAGE,
      );
      addEvent("StripeBillingPortalError");
      return false;
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return { openPortal, isLoadingPortal };
}
