import { History } from "../../history_types";

export function extractHistoryTree(
  history: History,
  version: number
): string[] {
  // Get all history items up to the current version
  const extractedHistory = history.slice(0, version + 1);

  // Convert the history into a flat array of strings that the backend expects
  const flatHistory: string[] = [];
  extractedHistory.forEach((item) => {
    if (item.type === "ai_create") {
      // Don't include the image for ai_create since the server
      // gets it passed and will include it directly
      flatHistory.push(item.code);
    } else {
      flatHistory.push(item.inputs.prompt);
      flatHistory.push(item.code);
    }
  });

  return flatHistory;
}
