import { capitalize } from "../utils";

interface PricingPlansStateParams {
  subscriberTier: string | null;
  billingInterval: "monthly" | "yearly" | null;
  selectedInterval: "monthly" | "yearly";
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
  isViewingDifferentInterval: boolean;
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

function getCurrentPlanLabel(billingInterval: "monthly" | "yearly" | null): string {
  if (!billingInterval) {
    return "Current plan";
  }

  return `Current ${billingInterval} plan`;
}

export function getPricingPlansState({
  subscriberTier,
  billingInterval,
  selectedInterval,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: PricingPlansStateParams): PricingPlansState {
  const isFreeUser = subscriberTier === "free" || !subscriberTier;
  const isCancellationScheduled = !isFreeUser && cancelAtPeriodEnd;
  const isViewingDifferentInterval =
    !isFreeUser
    && billingInterval !== null
    && billingInterval !== selectedInterval;

  const hobbyButton = {
    label: isFreeUser
      ? "Get Started"
      : subscriberTier === "hobby"
        ? isViewingDifferentInterval
          ? getCurrentPlanLabel(billingInterval)
          : "Current plan"
        : isCancellationScheduled
          ? "Manage billing to change"
          : isViewingDifferentInterval
            ? "Switch via support"
          : "Switch to Hobby now",
    disabled:
      subscriberTier === "hobby"
      || isCancellationScheduled
      || isViewingDifferentInterval,
  };

  const proButton = {
    label: isFreeUser
      ? "Get Started"
      : subscriberTier === "pro"
        ? isViewingDifferentInterval
          ? getCurrentPlanLabel(billingInterval)
          : "Current plan"
        : isCancellationScheduled
          ? "Manage billing to change"
          : isViewingDifferentInterval
            ? "Switch via support"
          : "Upgrade to Pro",
    disabled:
      subscriberTier === "pro"
      || isCancellationScheduled
      || isViewingDifferentInterval,
  };

  const cancellationNotice = isCancellationScheduled
    ? `Your ${capitalize(subscriberTier)} plan is scheduled to cancel on ${getCancellationDateLabel(currentPeriodEnd)}. To resume or change plans, manage billing first.`
    : null;

  return {
    isFreeUser,
    isCancellationScheduled,
    isViewingDifferentInterval,
    cancellationNotice,
    hobbyButton,
    proButton,
  };
}
