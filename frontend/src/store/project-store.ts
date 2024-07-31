import { create } from "zustand";
import { History } from "../components/history/history_types";

// Store for app-wide state
interface ProjectStore {
  // Inputs
  inputMode: "image" | "video";
  setInputMode: (mode: "image" | "video") => void;
  isImportedFromCode: boolean;
  setIsImportedFromCode: (imported: boolean) => void;
  referenceImages: string[];
  setReferenceImages: (images: string[]) => void;

  // Outputs and other state
  generatedCode: string;
  setGeneratedCode: (
    updater: string | ((currentCode: string) => string)
  ) => void;

  variants: string[];
  currentVariantIndex: number;
  setCurrentVariantIndex: (index: number) => void;
  setVariant: (code: string, index: number) => void;
  appendToVariant: (newTokens: string, index: number) => void;
  resetVariants: () => void;

  executionConsoles: { [key: number]: string[] };
  appendExecutionConsole: (variantIndex: number, line: string) => void;
  resetExecutionConsoles: () => void;

  // Tracks the currently shown version from app history
  // TODO: might want to move to appStore
  currentVersion: number | null;
  setCurrentVersion: (version: number | null) => void;

  appHistory: History;
  setAppHistory: (
    updater: History | ((currentHistory: History) => History)
  ) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  // Inputs and their setters
  inputMode: "image",
  setInputMode: (mode) => set({ inputMode: mode }),
  isImportedFromCode: false,
  setIsImportedFromCode: (imported) => set({ isImportedFromCode: imported }),
  referenceImages: [],
  setReferenceImages: (images) => set({ referenceImages: images }),

  // Outputs and other state
  generatedCode: "",
  setGeneratedCode: (updater) =>
    set((state) => ({
      generatedCode:
        typeof updater === "function" ? updater(state.generatedCode) : updater,
    })),

  variants: [],
  currentVariantIndex: 0,

  setCurrentVariantIndex: (index) => set({ currentVariantIndex: index }),
  setVariant: (code: string, index: number) =>
    set((state) => {
      const newVariants = [...state.variants];
      while (newVariants.length <= index) {
        newVariants.push("");
      }
      newVariants[index] = code;
      return { variants: newVariants };
    }),
  appendToVariant: (newTokens: string, index: number) =>
    set((state) => {
      const newVariants = [...state.variants];
      while (newVariants.length <= index) {
        newVariants.push("");
      }
      newVariants[index] += newTokens;
      return { variants: newVariants };
    }),
  resetVariants: () => set({ variants: [], currentVariantIndex: 0 }),

  executionConsoles: {},

  appendExecutionConsole: (variantIndex: number, line: string) =>
    set((state) => ({
      executionConsoles: {
        ...state.executionConsoles,
        [variantIndex]: [
          ...(state.executionConsoles[variantIndex] || []),
          line,
        ],
      },
    })),
  resetExecutionConsoles: () => set({ executionConsoles: {} }),

  currentVersion: null,
  setCurrentVersion: (version) => set({ currentVersion: version }),
  appHistory: [],
  setAppHistory: (updater) =>
    set((state) => ({
      appHistory:
        typeof updater === "function" ? updater(state.appHistory) : updater,
    })),
}));
