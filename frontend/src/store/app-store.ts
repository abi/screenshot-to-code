import { create } from "zustand";

// Store for app-wide state
interface AppStore {
  inSelectAndEditMode: boolean;
  inputMode: "image" | "video";
  toggleInSelectAndEditMode: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  inputMode: "image",
  inSelectAndEditMode: false,
  toggleInSelectAndEditMode: () =>
    set((state) => ({ inSelectAndEditMode: !state.inSelectAndEditMode })),
}));
