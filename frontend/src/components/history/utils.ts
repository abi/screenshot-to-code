import { Commit, CommitHash } from "./history_types";

export function extractHistory(
  hash: CommitHash,
  commits: Record<CommitHash, Commit>
): string[] {
  const flatHistory: string[] = [];

  let currentCommitHash: CommitHash | null = hash;
  while (currentCommitHash !== null) {
    const commit: Commit = commits[currentCommitHash];

    if (commit) {
      if (commit.type === "ai_create") {
        // Don't include the image for ai_create
        flatHistory.unshift(commit.variants[commit.selectedVariantIndex].code);
      } else if (commit.type === "ai_edit") {
        flatHistory.unshift(commit.variants[commit.selectedVariantIndex].code);
        flatHistory.unshift(commit.inputs.prompt);
      }
      // } else if (item.type === "code_create") {
      //   flatHistory.unshift(item.code);
      // }

      // Move to the parent of the current item
      currentCommitHash = commit.parentHash;
    } else {
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
    default: {
      const exhaustiveCheck: never = commitType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}
