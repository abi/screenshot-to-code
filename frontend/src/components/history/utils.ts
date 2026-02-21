import { Commit, CommitType } from "../commits/types";

function displayHistoryItemType(itemType: CommitType) {
  switch (itemType) {
    case "ai_create":
      return "Create";
    case "ai_edit":
      return "Edit";
    case "code_create":
      return "Imported from code";
    default: {
      const exhaustiveCheck: never = itemType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}

const setParentVersion = (commit: Commit, history: Commit[]) => {
  // If the commit has no parent, return null
  if (!commit.parentHash) return null;

  const parentIndex = history.findIndex(
    (item) => item.hash === commit.parentHash
  );
  const currentIndex = history.findIndex((item) => item.hash === commit.hash);

  // Only set parent version if the parent is not the previous commit
  // and parent exists
  return parentIndex !== -1 && parentIndex != currentIndex - 1
    ? parentIndex + 1
    : null;
};

function getCommitMedia(commit: Commit): { images: string[]; videos: string[] } {
  if (commit.type === "code_create") {
    return { images: [], videos: [] };
  }
  return {
    images: commit.inputs.images || [],
    videos: commit.inputs.videos || [],
  };
}

export function summarizeHistoryItem(commit: Commit) {
  const commitType = commit.type;
  switch (commitType) {
    case "ai_create":
      return "Create";
    case "ai_edit":
      return commit.inputs.text;
    case "code_create":
      return "Imported from code";
    default: {
      const exhaustiveCheck: never = commitType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}

export type RenderedHistoryItem = Omit<Commit, "type"> & {
  type: string;
  summary: string;
  parentVersion: number | null;
  images: string[];
  videos: string[];
};

export const renderHistory = (history: Commit[]): RenderedHistoryItem[] => {
  const renderedHistory: RenderedHistoryItem[] = [];

  for (let i = 0; i < history.length; i++) {
    const commit = history[i];
    const media = getCommitMedia(commit);
    renderedHistory.push({
      ...commit,
      type: displayHistoryItemType(commit.type),
      summary: summarizeHistoryItem(commit),
      parentVersion: setParentVersion(commit, history),
      images: media.images,
      videos: media.videos,
    });
  }

  return renderedHistory;
};
