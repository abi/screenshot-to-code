import { create } from "zustand";

interface Store {
  subscriberTier: string;
  setSubscriberTier: (tier: string) => void;
}

export const useStore = create<Store>((set) => ({
  subscriberTier: "",
  setSubscriberTier: (tier: string) => set(() => ({ subscriberTier: tier })),
}));
