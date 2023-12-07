import { History, HistoryItem } from "./history_types";

export function extractHistoryTree(
  history: History,
  version: number
): string[] {
  const flatHistory: string[] = [];

  let currentIndex: number | null = version;
  while (currentIndex !== null) {
    // TODO: Handle currentIndex being out of bounds
    const item: HistoryItem = history[currentIndex];
    console.log(item);

    if (item) {
      if (item.type === "ai_create") {
        // Don't include the image for ai_create
        flatHistory.unshift(item.code);
      } else {
        flatHistory.unshift(item.code);
        flatHistory.unshift(item.inputs.prompt);
      }

      // Move to the parent of the current item
      currentIndex = item.parentIndex;
    } else {
      // Break the loop if the item is not found (should not happen in a well-formed history)
      break;
    }
  }

  return flatHistory;
}
