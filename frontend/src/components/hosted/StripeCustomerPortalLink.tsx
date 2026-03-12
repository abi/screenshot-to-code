import React, { forwardRef } from "react";
import Spinner from "../core/Spinner";
import useStripePortal from "./payments/useStripePortal";

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string;
  action?: "manage" | "cancel";
}

const StripeCustomerPortalLink = forwardRef<HTMLAnchorElement, Props>(
  ({ label, action = "manage", ...props }, ref) => {
    const { openPortal, isLoadingPortal } = useStripePortal();

    const redirectToBillingPortal = async (
      event: React.MouseEvent<HTMLAnchorElement>,
    ) => {
      event.preventDefault();
      await openPortal(
        { action },
        "Error directing you to the billing portal. Please email support and we'll get it fixed right away.",
      );
    };

    return (
      <a {...props} ref={ref} onClick={redirectToBillingPortal}>
        <div className="flex gap-x-2">
          {label} {isLoadingPortal && <Spinner />}
        </div>
      </a>
    );
  }
);

StripeCustomerPortalLink.displayName = "StripeCustomerPortalLink";

export default StripeCustomerPortalLink;
