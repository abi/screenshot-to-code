import { create } from "zustand";
import {
  AgentEvent,
  Commit,
  CommitHash,
  VariantHistoryMessage,
  VariantStatus,
} from "../components/commits/types";
import { PromptAsset } from "../types";

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
  assetsById: Record<string, PromptAsset>;
  upsertPromptAssets: (assets: PromptAsset[]) => void;
  resetPromptAssets: () => void;

  // Outputs
  commits: Record<string, Commit>;
  head: CommitHash | null;
  latestCommitHash: CommitHash | null;

  addCommit: (commit: Commit) => void;
  removeCommit: (hash: CommitHash) => void;
  resetCommits: () => void;

  appendCommitCode: (
    hash: CommitHash,
    numVariant: number,
    code: string
  ) => void;
  appendVariantThinking: (
    hash: CommitHash,
    numVariant: number,
    thinking: string
  ) => void;
  setCommitCode: (hash: CommitHash, numVariant: number, code: string) => void;
  appendVariantHistoryMessage: (
    hash: CommitHash,
    numVariant: number,
    message: VariantHistoryMessage
  ) => void;
  updateSelectedVariantIndex: (hash: CommitHash, index: number) => void;
  updateVariantStatus: (
    hash: CommitHash,
    numVariant: number,
    status: VariantStatus,
    errorMessage?: string
  ) => void;
  resizeVariants: (hash: CommitHash, count: number) => void;
  setVariantModels: (hash: CommitHash, models: string[]) => void;

  startAgentEvent: (
    hash: CommitHash,
    numVariant: number,
    event: AgentEvent
  ) => void;
  appendAgentEventContent: (
    hash: CommitHash,
    numVariant: number,
    eventId: string,
    content: string
  ) => void;
  finishAgentEvent: (
    hash: CommitHash,
    numVariant: number,
    eventId: string,
    updates: Partial<AgentEvent>
  ) => void;

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
  assetsById: {},
  upsertPromptAssets: (assets) =>
    set((state) => {
      if (assets.length === 0) return state;
      const merged = { ...state.assetsById };
      for (const asset of assets) {
        merged[asset.id] = asset;
      }
      return { assetsById: merged };
    }),
  resetPromptAssets: () => set({ assetsById: {} }),

  // Outputs
  commits: {},
  head: null,
  latestCommitHash: null,

  addCommit: (commit: Commit) => {
    // Initialize variant statuses as 'generating' and start thinking timer
    const commitsWithStatus = {
      ...commit,
      variants: commit.variants.map((variant) => ({
        ...variant,
        history: variant.history || [],
        status: variant.status || ("generating" as VariantStatus),
        thinkingStartTime: Date.now(),
        agentEvents: [],
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
      latestCommitHash: commitsWithStatus.hash,
    }));
  },
  removeCommit: (hash: CommitHash) => {
    set((state) => {
      const newCommits = { ...state.commits };
      delete newCommits[hash];
      return { commits: newCommits };
    });
  },
  resetCommits: () => set({ commits: {}, latestCommitHash: null }),

  appendCommitCode: (hash: CommitHash, numVariant: number, code: string) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit) {
        return state;
      }
      // Don't update if the commit is already committed
      if (commit.isCommitted) {
        return state;
      }
      const variant = commit.variants[numVariant];
      const isFirstCode = !variant.code && variant.thinkingStartTime;
      const duration = isFirstCode
        ? Math.round((Date.now() - variant.thinkingStartTime!) / 1000)
        : variant.thinkingDuration;
      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            variants: commit.variants.map((v, index) =>
              index === numVariant
                ? { ...v, code: v.code + code, thinkingDuration: duration }
                : v
            ),
          },
        },
      };
    }),
  appendVariantThinking: (hash: CommitHash, numVariant: number, thinking: string) =>
    set((state) => {
      const commit = state.commits[hash];
      // Don't update if the commit is already committed
      if (commit.isCommitted) {
        throw new Error("Attempted to append thinking to a committed commit");
      }
      return {
        commits: {
          ...state.commits,
          [hash]: {
            ...commit,
            variants: commit.variants.map((v, index) =>
              index === numVariant
                ? {
                    ...v,
                    thinking: (v.thinking || "") + thinking,
                  }
                : v
            ),
          },
        },
      };
    }),
  setCommitCode: (hash: CommitHash, numVariant: number, code: string) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit) {
        return state;
      }
      // Don't update if the commit is already committed
      if (commit.isCommitted) {
        return state;
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
  appendVariantHistoryMessage: (hash, numVariant, message) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit || commit.isCommitted) return state;
      const variants = commit.variants.map((variant, index) => {
        if (index !== numVariant) return variant;
        const history = variant.history || [];
        const last = history[history.length - 1];
        const isDuplicate =
          last &&
          last.role === message.role &&
          last.text === message.text &&
          last.imageAssetIds.join("|") === message.imageAssetIds.join("|") &&
          last.videoAssetIds.join("|") === message.videoAssetIds.join("|");
        if (isDuplicate) return variant;
        return { ...variant, history: [...history, message] };
      });
      return {
        commits: {
          ...state.commits,
          [hash]: { ...commit, variants },
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
      const seedHistory = currentVariants[0]?.history || [];
      const newVariants = Array(count).fill(null).map((_, index) => 
        currentVariants[index] || {
          code: "",
          history: seedHistory.map((message) => ({
            ...message,
            imageAssetIds: [...message.imageAssetIds],
            videoAssetIds: [...message.videoAssetIds],
          })),
          status: "generating" as VariantStatus,
          agentEvents: [],
        }
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
  setVariantModels: (hash: CommitHash, models: string[]) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit || commit.isCommitted) return state;
      const variants = commit.variants.map((variant, index) => ({
        ...variant,
        model: models[index] ?? variant.model,
      }));
      return {
        commits: {
          ...state.commits,
          [hash]: { ...commit, variants },
        },
      };
    }),

  startAgentEvent: (hash, numVariant, event) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit || commit.isCommitted) return state;
      const variants = commit.variants.map((variant, index) => {
        if (index !== numVariant) return variant;
        const events = variant.agentEvents || [];
        const existingIndex = events.findIndex((e) => e.id === event.id);
        if (existingIndex === -1) {
          return { ...variant, agentEvents: [...events, event] };
        }
        const updatedEvents = events.map((e) =>
          e.id === event.id
            ? {
                ...e,
                ...event,
                content: event.content ? event.content : e.content,
                startedAt: e.startedAt || event.startedAt,
              }
            : e
        );
        return { ...variant, agentEvents: updatedEvents };
      });
      return {
        commits: {
          ...state.commits,
          [hash]: { ...commit, variants },
        },
      };
    }),

  appendAgentEventContent: (hash, numVariant, eventId, content) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit || commit.isCommitted) return state;
      const variants = commit.variants.map((variant, index) => {
        if (index !== numVariant) return variant;
        const events = variant.agentEvents || [];
        const updatedEvents = events.map((event) =>
          event.id === eventId
            ? { ...event, content: (event.content || "") + content }
            : event
        );
        return { ...variant, agentEvents: updatedEvents };
      });
      return {
        commits: {
          ...state.commits,
          [hash]: { ...commit, variants },
        },
      };
    }),

  finishAgentEvent: (hash, numVariant, eventId, updates) =>
    set((state) => {
      const commit = state.commits[hash];
      if (!commit || commit.isCommitted) return state;
      const variants = commit.variants.map((variant, index) => {
        if (index !== numVariant) return variant;
        const events = variant.agentEvents || [];
        const updatedEvents = events.map((event) =>
          event.id === eventId ? { ...event, ...updates } : event
        );
        return { ...variant, agentEvents: updatedEvents };
      });
      return {
        commits: {
          ...state.commits,
          [hash]: { ...commit, variants },
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
