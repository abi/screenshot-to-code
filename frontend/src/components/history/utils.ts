import { History } from "../../history_types";

export function extractHistoryTree(
  history: History,
  version: number
): string[] {
  // History is in reverse chronological order

  // Get all history items up to the current version
  const extractedHistory = history.slice(version);

  const obj: string[] = [];

  // Reverse the history so that it is in chronological order for the server
  extractedHistory.reverse().forEach((item) => {
    // Don't include the image for ai_create since the server gets it passed and will include it directly
    if (item.type !== "ai_create") {
      obj.push(item.inputs.prompt);
    }
    obj.push(item.code);
  });

  return obj;
}
