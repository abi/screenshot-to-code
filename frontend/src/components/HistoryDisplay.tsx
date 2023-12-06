import { ScrollArea } from "@/components/ui/scroll-area";
import { History, HistoryItemType } from "../history_types";
import toast from "react-hot-toast";
import classNames from "classnames";

interface Props {
  history: History;
  currentVersion: number | null;
  revertToVersion: (version: number) => void;
  shouldDisableReverts: boolean;
}

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

function displayHistoryItemType(itemType: HistoryItemType) {
  switch (itemType) {
    case "ai_create":
      return "Create";
    case "ai_edit":
      return "Edit";
    default:
      // TODO: Error out since this is exhaustive
      return "Unknown";
  }
}

export default function HistoryDisplay({
  history,
  currentVersion,
  revertToVersion,
  shouldDisableReverts,
}: Props) {
  return history.length === 0 ? null : (
    <div className="flex flex-col h-screen">
      <h1 className="font-bold mb-2">History</h1>
      <ScrollArea className="flex-1 overflow-y-auto">
        <ul className="space-y-0">
          {history.map((item, index) => (
            <li
              key={index}
              className={classNames(
                "flex items-center space-x-2 justify-between p-2",
                "border-b cursor-pointer",
                {
                  " hover:bg-black hover:text-white": index !== currentVersion,
                  "bg-slate-500 text-white": index === currentVersion,
                }
              )}
              onClick={() =>
                shouldDisableReverts
                  ? toast.error(
                      "Please wait for code generation to complete before viewing an older version."
                    )
                  : revertToVersion(index)
              }
            >
              <h2 className="text-sm">{displayHistoryItemType(item.type)}</h2>
              <h2 className="text-sm">v{history.length - index}</h2>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
