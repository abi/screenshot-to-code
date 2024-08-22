import { Commit, CommitHash } from "./history_types";

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
      // TODO*: Send to Sentry
      throw new Error("Malformed history: missing parent index");
    }
  }

  return flatHistory;
}

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
