import toast from "react-hot-toast";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch";
import { addEvent } from "../../lib/analytics";
import { SAAS_BACKEND_URL } from "../../config";
import { PortalSessionResponse } from "./types";
import { forwardRef, useState } from "react";
import Spinner from "../core/Spinner";

interface Props {
  label: string;
}

const StripeCustomerPortalLink = forwardRef<HTMLAnchorElement, Props>(
  ({ label, ...props }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const authenticatedFetch = useAuthenticatedFetch();

    const redirectToBillingPortal = async () => {
      try {
        setIsLoading(true);
        const res: PortalSessionResponse = await authenticatedFetch(
          SAAS_BACKEND_URL + "/payments/create_portal_session",
          "POST"
        );
        window.location.href = res.url;
      } catch (e) {
        toast.error(
          "Error directing you to the billing portal. Please email support and we'll get it fixed right away."
        );
        addEvent("StripeBillingPortalError");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <a {...props} ref={ref} onClick={redirectToBillingPortal}>
        <div className="flex gap-x-2">
          {label} {isLoading && <Spinner />}
        </div>
      </a>
    );
  }
);

StripeCustomerPortalLink.displayName = "StripeCustomerPortalLink";

export default StripeCustomerPortalLink;
