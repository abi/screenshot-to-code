import { create } from "zustand";
import { AppState } from "../types";

// Store for app-wide state
interface AppStore {
  appState: AppState;
  setAppState: (state: AppState) => void;

  // UI state
  updateInstruction: string;
  setUpdateInstruction: (instruction: string) => void;
  shouldIncludeResultImage: boolean;
  setShouldIncludeResultImage: (shouldInclude: boolean) => void;

  inSelectAndEditMode: boolean;
  toggleInSelectAndEditMode: () => void;
  disableInSelectAndEditMode: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  appState: AppState.INITIAL,
  setAppState: (state: AppState) => set({ appState: state }),

  // UI state
  updateInstruction: "",
  setUpdateInstruction: (instruction: string) =>
    set({ updateInstruction: instruction }),
  shouldIncludeResultImage: true,
  setShouldIncludeResultImage: (shouldInclude: boolean) =>
    set({ shouldIncludeResultImage: shouldInclude }),

  inSelectAndEditMode: false,
  toggleInSelectAndEditMode: () =>
    set((state) => ({ inSelectAndEditMode: !state.inSelectAndEditMode })),
  disableInSelectAndEditMode: () => set({ inSelectAndEditMode: false }),
}));
