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

function displayHistoryItemType(itemType: HistoryItemType) {
  switch (itemType) {
    case "ai_create":
      return "Create";
    case "ai_edit":
      return "Edit";
    case "code_create":
      return "Create";
    case "code_edit":
      return "Code Edit";
    case "revert":
      return "Revert";
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
