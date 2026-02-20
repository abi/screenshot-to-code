import { create } from "zustand";

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
}));
