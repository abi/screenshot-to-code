import {
  History,
  HistoryItem,
  HistoryItemType,
  RenderedHistoryItem,
} from "./history_types";

export function extractHistoryTree(
  history: History,
  version: number
): string[] {
  const flatHistory: string[] = [];

  let currentIndex: number | null = version;
  while (currentIndex !== null) {
    const item: HistoryItem = history[currentIndex];

    if (item) {
      if (item.type === "ai_create") {
        // Don't include the image for ai_create
        flatHistory.unshift(item.code);
      } else if (item.type === "ai_edit") {
        flatHistory.unshift(item.code);
        flatHistory.unshift(item.inputs.prompt);
      } else if (item.type === "code_create") {
        flatHistory.unshift(item.code);
      }

      // Move to the parent of the current item
      currentIndex = item.parentIndex;
    } else {
      throw new Error("Malformed history: missing parent index");
    }
  }

  return flatHistory;
}

function displayHistoryItemType(itemType: HistoryItemType) {
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

function summarizeHistoryItem(item: HistoryItem) {
  const itemType = item.type;
  switch (itemType) {
    case "ai_create":
      return "Create";
    case "ai_edit":
      return item.inputs.prompt;
    case "code_create":
      return "Imported from code";
    default: {
      const exhaustiveCheck: never = itemType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}

export const renderHistory = (
  history: History,
  currentVersion: number | null
) => {
  const renderedHistory: RenderedHistoryItem[] = [];

  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    // Only show the parent version if it's not the previous version
    // (i.e. it's the branching point) and if it's not the first version
    const parentVersion =
      item.parentIndex !== null && item.parentIndex !== i - 1
        ? `v${(item.parentIndex || 0) + 1}`
        : null;
    const type = displayHistoryItemType(item.type);
    const isActive = i === currentVersion;
    const summary = summarizeHistoryItem(item);
    renderedHistory.push({
      isActive,
      summary: summary,
      parentVersion,
      type,
    });
  }

  return renderedHistory;
};
