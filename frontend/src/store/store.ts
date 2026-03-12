import { create } from "zustand";
import { BillingInterval } from "../components/hosted/types";
import { ExperimentGroup } from "../lib/experiment";
import { SAAS_BACKEND_URL } from "../config";

// Store for non-open source (hosted) features
interface Store {
  isPricingDialogOpen: boolean;
  setPricingDialogOpen: (isOpen: boolean) => void;
  isProjectsPanelOpen: boolean;
  setProjectsPanelOpen: (isOpen: boolean) => void;
  isAccountPanelOpen: boolean;
  setAccountPanelOpen: (isOpen: boolean) => void;
  subscriberTier: string;
  setSubscriberTier: (tier: string) => void;
  billingInterval: BillingInterval | null;
  currentPriceLookupKey: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  setHostedBillingState: (billing: {
    subscriberTier: string;
    billingInterval: BillingInterval | null;
    currentPriceLookupKey: string | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }) => void;
  experimentGroup: ExperimentGroup | null;
  setExperimentGroup: (group: ExperimentGroup) => void;
  freeTrialUsed: number;
  freeTrialLimit: number;
  setFreeTrialUsage: (used: number, limit: number) => void;
}

export const useStore = create<Store>((set) => ({
  isPricingDialogOpen: false,
  setPricingDialogOpen: (isOpen: boolean) =>
    set(() => ({ isPricingDialogOpen: isOpen })),
  isProjectsPanelOpen: false,
  setProjectsPanelOpen: (isOpen: boolean) =>
    set(() => ({ isProjectsPanelOpen: isOpen })),
  isAccountPanelOpen: false,
  setAccountPanelOpen: (isOpen: boolean) =>
    set(() => ({ isAccountPanelOpen: isOpen })),
  subscriberTier: "",
  setSubscriberTier: (tier: string) => set(() => ({ subscriberTier: tier })),
  billingInterval: null,
  currentPriceLookupKey: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  setHostedBillingState: (billing) =>
    set(() => ({
      subscriberTier: billing.subscriberTier,
      billingInterval: billing.billingInterval,
      currentPriceLookupKey: billing.currentPriceLookupKey,
      subscriptionStatus: billing.subscriptionStatus,
      currentPeriodEnd: billing.currentPeriodEnd,
      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
    })),
  experimentGroup: null,
  setExperimentGroup: (group: ExperimentGroup) =>
    set(() => ({ experimentGroup: group })),
  freeTrialUsed: 0,
  freeTrialLimit: 0,
  setFreeTrialUsage: (used: number, limit: number) =>
    set(() => ({ freeTrialUsed: used, freeTrialLimit: limit })),
}));

// Standalone helper (not a hook) to refresh free trial usage from the server.
// Takes Clerk's getToken so it can be called from any callback.
export async function refreshFreeTrialUsage(
  getToken: () => Promise<string | null>
) {
  try {
    const token = await getToken();
    if (!token || !SAAS_BACKEND_URL) return;

    const res = await fetch(SAAS_BACKEND_URL + "/credits/free_trial_usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const usage = await res.json();
      useStore.getState().setFreeTrialUsage(usage.used, usage.limit);
    }
  } catch {
    // Non-critical — banner stays at old count
  }
}
