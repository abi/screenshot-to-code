import { create } from "zustand";

interface Store {
  isPricingDialogOpen: boolean;
  setPricingDialogOpen: (isOpen: boolean) => void;
  subscriberTier: string;
  setSubscriberTier: (tier: string) => void;
}

export const useStore = create<Store>((set) => ({
  isPricingDialogOpen: false,
  setPricingDialogOpen: (isOpen: boolean) =>
    set(() => ({ isPricingDialogOpen: isOpen })),
  subscriberTier: "",
  setSubscriberTier: (tier: string) => set(() => ({ subscriberTier: tier })),
}));
