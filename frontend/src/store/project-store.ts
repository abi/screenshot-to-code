import { create } from "zustand";
import { Commit, CommitHash, VariantStatus } from "../components/commits/types";

// Store for app-wide state
interface ProjectStore {
  // Inputs
  inputMode: "image" | "video" | "text";
  setInputMode: (mode: "image" | "video" | "text") => void;
  isImportedFromCode: boolean;
  setIsImportedFromCode: (imported: boolean) => void;
  referenceImages: string[];
  setReferenceImages: (images: string[]) => void;
  initialPrompt: string;
  setInitialPrompt: (prompt: string) => void;

  // Outputs
  commits: Record<string, Commit>;
  head: CommitHash | null;

  addCommit: (commit: Commit) => void;
  removeCommit: (hash: CommitHash) => void;
  resetCommits: () => void;

  appendCommitCode: (
    hash: CommitHash,
    numVariant: number,
    code: string
  ) => void;
  setCommitCode: (hash: CommitHash, numVariant: number, code: string) => void;
  updateSelectedVariantIndex: (hash: CommitHash, index: number) => void;
  updateVariantStatus: (
    hash: CommitHash,
    numVariant: number,
    status: VariantStatus,
    errorMessage?: string
  ) => void;
  resizeVariants: (hash: CommitHash, count: number) => void;

  setHead: (hash: CommitHash) => void;
  resetHead: () => void;

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
  initialPrompt: "",
  setInitialPrompt: (prompt) => set({ initialPrompt: prompt }),

  // Outputs
  commits: {},
  head: null,

  addCommit: (commit: Commit) => {
    // Initialize variant statuses as 'generating'
    const commitsWithStatus = {
      ...commit,
      variants: commit.variants.map((variant) => ({
        ...variant,
        status: variant.status || ("generating" as VariantStatus),
      })),
    };

    // When adding a new commit, make sure all existing commits are marked as committed
    set((state) => ({
      commits: {
        ...Object.fromEntries(
          Object.entries(state.commits).map(([hash, existingCommit]) => [
            hash,
            { ...existingCommit, isCommitted: true },
          ])
        ),
        [commitsWithStatus.hash]: commitsWithStatus,
      },
    }));
  },
  removeCommit: (hash: CommitHash) => {
    set((state) => {
      const newCommits = { ...state.commits };
      delete newCommits[hash];
      return { commits: newCommits };
    });
  },
  resetCommits: () => set({ commits: {} }),

  appendCommitCode: (hash: CommitHash, numVariant: number, code: string) =>
    set((state) => {
      const commit = state.commits[hash];
      // Don't update if the commit is already committed
      if (commit.isCommitted) {
        throw new Error("Attempted to append code to a committed commit");
      }
      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            variants: commit.variants.map((variant, index) =>
              index === numVariant
                ? { ...variant, code: variant.code + code }
                : variant
            ),
          },
        },
      };
    }),
  setCommitCode: (hash: CommitHash, numVariant: number, code: string) =>
    set((state) => {
      const commit = state.commits[hash];
      // Don't update if the commit is already committed
      if (commit.isCommitted) {
        throw new Error("Attempted to set code of a committed commit");
      }
      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            variants: commit.variants.map((variant, index) =>
              index === numVariant ? { ...variant, code } : variant
            ),
          },
        },
      };
    }),
  updateSelectedVariantIndex: (hash: CommitHash, index: number) =>
    set((state) => {
      const commit = state.commits[hash];
      // Don't update if the commit is already committed
      if (commit.isCommitted) {
        throw new Error(
          "Attempted to update selected variant index of a committed commit"
        );
      }

      // Just update the selected variant index without canceling other variants
      // This allows users to switch between variants even while they're still generating
      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            selectedVariantIndex: index,
          },
        },
      };
    }),
  updateVariantStatus: (
    hash: CommitHash,
    numVariant: number,
    status: VariantStatus,
    errorMessage?: string
  ) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit) return state; // No change if commit doesn't exist

      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            variants: commit.variants.map((variant, index) =>
              index === numVariant 
                ? { ...variant, status, errorMessage: status === 'error' ? errorMessage : undefined } 
                : variant
            ),
          },
        },
      };
    }),
  resizeVariants: (hash: CommitHash, count: number) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit) return state; // No change if commit doesn't exist

      // Resize variants array to match backend count
      const currentVariants = commit.variants;
      const newVariants = Array(count).fill(null).map((_, index) => 
        currentVariants[index] || { code: "", status: "generating" as VariantStatus }
      );

      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            variants: newVariants,
            selectedVariantIndex: Math.min(commit.selectedVariantIndex, count - 1),
          },
        },
      };
    }),

  setHead: (hash: CommitHash) => set({ head: hash }),
  resetHead: () => set({ head: null }),

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
