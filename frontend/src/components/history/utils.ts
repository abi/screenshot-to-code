import { Commit, CommitHash, CommitType } from "../commits/types";

export function extractHistory(
  hash: CommitHash,
  commits: Record<CommitHash, Commit>
): string[] {
  const flatHistory: string[] = [];

  let currentCommitHash: CommitHash | null = hash;
  while (currentCommitHash !== null) {
    const commit: Commit | null = commits[currentCommitHash];

    if (commit) {
      flatHistory.unshift(commit.variants[commit.selectedVariantIndex].code);

      // For edits, add the prompt to the history
      if (commit.type === "ai_edit") {
        flatHistory.unshift(commit.inputs.prompt);
      }

      // Move to the parent of the current item
      currentCommitHash = commit.parentHash;
    } else {
      throw new Error("Malformed history: missing parent index");
    }
  }

  return flatHistory;
}

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

export function summarizeHistoryItem(commit: Commit) {
  const commitType = commit.type;
  switch (commitType) {
    case "ai_create":
      return "Create";
    case "ai_edit":
      return commit.inputs.prompt;
    case "code_create":
      return "Imported from code";
    default: {
      const exhaustiveCheck: never = commitType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}

export const renderHistory = (history: Commit[]) => {
  const renderedHistory = [];

  for (let i = 0; i < history.length; i++) {
    const commit = history[i];
    renderedHistory.push({
      ...commit,
      type: displayHistoryItemType(commit.type),
      summary: summarizeHistoryItem(commit),
      parentVersion: setParentVersion(commit, history),
    });
  }

  return renderedHistory;
};
