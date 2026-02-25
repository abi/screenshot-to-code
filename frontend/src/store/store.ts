import { create } from "zustand";
import { ExperimentGroup } from "../lib/experiment";

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
  experimentGroup: null,
  setExperimentGroup: (group: ExperimentGroup) =>
    set(() => ({ experimentGroup: group })),
  freeTrialUsed: 0,
  freeTrialLimit: 0,
  setFreeTrialUsage: (used: number, limit: number) =>
    set(() => ({ freeTrialUsed: used, freeTrialLimit: limit })),
}));
