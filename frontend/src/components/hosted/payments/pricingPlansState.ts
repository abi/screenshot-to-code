import { capitalize } from "../utils";

interface PricingPlansStateParams {
  subscriberTier: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

interface PricingPlanButtonState {
  label: string;
  disabled: boolean;
}

export interface PricingPlansState {
  isFreeUser: boolean;
  isCancellationScheduled: boolean;
  cancellationNotice: string | null;
  hobbyButton: PricingPlanButtonState;
  proButton: PricingPlanButtonState;
}

function getCancellationDateLabel(currentPeriodEnd: string | null): string {
  if (!currentPeriodEnd) {
    return "the end of your billing period";
  }

  return new Date(currentPeriodEnd).toLocaleDateString();
}

export function getPricingPlansState({
  subscriberTier,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: PricingPlansStateParams): PricingPlansState {
  const isFreeUser = subscriberTier === "free" || !subscriberTier;
  const isCancellationScheduled = !isFreeUser && cancelAtPeriodEnd;

  const hobbyButton = {
    label: isFreeUser
      ? "Get Started"
      : subscriberTier === "hobby"
        ? "Current plan"
        : isCancellationScheduled
          ? "Manage billing to change"
          : "Switch to Hobby now",
    disabled: subscriberTier === "hobby" || isCancellationScheduled,
  };

  const proButton = {
    label: isFreeUser
      ? "Get Started"
      : subscriberTier === "pro"
        ? "Current plan"
        : isCancellationScheduled
          ? "Manage billing to change"
          : "Upgrade to Pro",
    disabled: subscriberTier === "pro" || isCancellationScheduled,
  };

  const cancellationNotice = isCancellationScheduled
    ? `Your ${capitalize(subscriberTier)} plan is scheduled to cancel on ${getCancellationDateLabel(currentPeriodEnd)}. To resume or change plans, manage billing first.`
    : null;

  return {
    isFreeUser,
    isCancellationScheduled,
    cancellationNotice,
    hobbyButton,
    proButton,
  };
}
