import { create } from "zustand";

// Store for app-wide state
interface AppStore {
  inSelectAndEditMode: boolean;
  inputMode: "image" | "video";
  toggleInSelectAndEditMode: () => void;
  disableInSelectAndEditMode: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  inputMode: "image",
  inSelectAndEditMode: false,
  toggleInSelectAndEditMode: () =>
    set((state) => ({ inSelectAndEditMode: !state.inSelectAndEditMode })),
  disableInSelectAndEditMode: () => set({ inSelectAndEditMode: false }),
}));
