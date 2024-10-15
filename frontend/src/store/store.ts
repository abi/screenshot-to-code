import { create } from "zustand";

// Store for non-open source (hosted) features
interface Store {
  isPricingDialogOpen: boolean;
  setPricingDialogOpen: (isOpen: boolean) => void;
  isProjectsHistoryDialogOpen: boolean;
  setProjectsHistoryDialogOpen: (isOpen: boolean) => void;
  subscriberTier: string;
  setSubscriberTier: (tier: string) => void;
}

export const useStore = create<Store>((set) => ({
  isPricingDialogOpen: false,
  setPricingDialogOpen: (isOpen: boolean) =>
    set(() => ({ isPricingDialogOpen: isOpen })),
  isProjectsHistoryDialogOpen: false,
  setProjectsHistoryDialogOpen: (isOpen: boolean) =>
    set(() => ({ isProjectsHistoryDialogOpen: isOpen })),
  subscriberTier: "",
  setSubscriberTier: (tier: string) => set(() => ({ subscriberTier: tier })),
}));
