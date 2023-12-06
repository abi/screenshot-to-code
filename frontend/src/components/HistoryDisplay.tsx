import { ScrollArea } from "@/components/ui/scroll-area";
import { History, HistoryItemType } from "../history_types";

interface Props {
  history: History;
  revertToVersion: (version: number) => void;
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

export default function HistoryDisplay({ history, revertToVersion }: Props) {
  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="font-bold mb-4">History</h1>
      <ScrollArea className="flex-1 overflow-y-auto">
        <ul className="space-y-4">
          {history.map((item, index) => (
            <li
              key={index}
              className="flex items-center space-x-4 justify-between border-b pb-1 cursor-pointer"
              onClick={() => revertToVersion(index)}
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
