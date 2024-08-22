import { create } from "zustand";
import { Commit, CommitHash } from "../components/history/history_types";

// Store for app-wide state
interface ProjectStore {
  // Inputs
  inputMode: "image" | "video";
  setInputMode: (mode: "image" | "video") => void;
  isImportedFromCode: boolean;
  setIsImportedFromCode: (imported: boolean) => void;
  referenceImages: string[];
  setReferenceImages: (images: string[]) => void;

  // Outputs
  commits: Record<string, Commit>;
  head: CommitHash | null;

  addCommit: (commit: Commit) => void;
  removeCommit: (hash: CommitHash) => void;

  setHead: (hash: CommitHash) => void;
  appendCommitCode: (
    hash: CommitHash,
    numVariant: number,
    code: string
  ) => void;
  setCommitCode: (hash: CommitHash, numVariant: number, code: string) => void;
  updateSelectedVariantIndex: (hash: CommitHash, index: number) => void;
  resetCommits: () => void;

  executionConsoles: { [key: number]: string[] };
  appendExecutionConsole: (variantIndex: number, line: string) => void;
  resetExecutionConsoles: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  // Inputs and their setters
  inputMode: "image",
  setInputMode: (mode) => set({ inputMode: mode }),
  isImportedFromCode: false,
  setIsImportedFromCode: (imported) => set({ isImportedFromCode: imported }),
  referenceImages: [],
  setReferenceImages: (images) => set({ referenceImages: images }),

  // Outputs
  commits: {},
  head: null,

  addCommit: (commit: Commit) => {
    set((state) => ({
      commits: { ...state.commits, [commit.hash]: commit },
    }));
  },
  removeCommit: (hash: CommitHash) => {
    set((state) => {
      const newCommits = { ...state.commits };
      delete newCommits[hash];
      return { commits: newCommits };
    });
  },

  setHead: (hash: CommitHash) => set({ head: hash }),
  appendCommitCode: (hash: CommitHash, numVariant: number, code: string) =>
    set((state) => ({
      commits: {
        ...state.commits,
        [hash]: {
          ...state.commits[hash],
          variants: state.commits[hash].variants.map((variant, index) =>
            index === numVariant
              ? { ...variant, code: variant.code + code }
              : variant
          ),
        },
      },
    })),
  setCommitCode: (hash: CommitHash, numVariant: number, code: string) =>
    set((state) => ({
      commits: {
        ...state.commits,
        [hash]: {
          ...state.commits[hash],
          variants: state.commits[hash].variants.map((variant, index) =>
            index === numVariant ? { ...variant, code } : variant
          ),
        },
      },
    })),
  updateSelectedVariantIndex: (hash: CommitHash, index: number) =>
    set((state) => ({
      commits: {
        ...state.commits,
        [hash]: {
          ...state.commits[hash],
          selectedVariantIndex: index,
        },
      },
    })),
  resetCommits: () => set({ commits: {}, head: null }),
  // TODO: Reset heads

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
}));
