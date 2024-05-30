import { create } from "zustand";

// Store for app-wide state
interface AppStore {
  inputMode: "image" | "video";
}

export const useStore = create<AppStore>(() => ({
  inputMode: "image",
}));
