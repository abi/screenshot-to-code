import { useState } from "react";
import toast from "react-hot-toast";
import { SAAS_BACKEND_URL } from "../../../config";
import { addEvent } from "../../../lib/analytics";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import {
  CreatePortalSessionRequest,
  PortalSessionResponse,
} from "../types";

const GENERIC_PORTAL_ERROR_MESSAGE =
  "Error directing you to the billing portal. Please email support and we'll get it fixed right away.";

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
