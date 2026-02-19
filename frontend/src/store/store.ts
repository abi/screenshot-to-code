import { create } from "zustand";

// Store for non-open source (hosted) features
interface Store {
  isPricingDialogOpen: boolean;
  setPricingDialogOpen: (isOpen: boolean) => void;
  isProjectsPanelOpen: boolean;
  setProjectsPanelOpen: (isOpen: boolean) => void;
  subscriberTier: string;
  setSubscriberTier: (tier: string) => void;
}

export const useStore = create<Store>((set) => ({
  isPricingDialogOpen: false,
  setPricingDialogOpen: (isOpen: boolean) =>
    set(() => ({ isPricingDialogOpen: isOpen })),
  isProjectsPanelOpen: false,
  setProjectsPanelOpen: (isOpen: boolean) =>
    set(() => ({ isProjectsPanelOpen: isOpen })),
  subscriberTier: "",
  setSubscriberTier: (tier: string) => set(() => ({ subscriberTier: tier })),
}));
