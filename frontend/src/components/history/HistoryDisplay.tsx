import { History, HistoryItemType } from "./history_types";
import toast from "react-hot-toast";
import classNames from "classnames";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card";
import { Badge } from "../ui/badge";

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
    default: {
      const exhaustiveCheck: never = itemType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
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
      <h1 className="font-bold mb-2">Versions</h1>
      <ul className="space-y-0 flex flex-col-reverse">
        {history.map((item, index) => (
          <li key={index}>
            <HoverCard>
              <HoverCardTrigger
                className={classNames(
                  "flex items-center justify-between space-x-2 p-2",
                  "border-b cursor-pointer",
                  {
                    " hover:bg-black hover:text-white":
                      index !== currentVersion,
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
                {" "}
                <div className="flex gap-x-1 truncate">
                  <h2 className="text-sm truncate">
                    {item.type === "ai_edit" ? item.inputs.prompt : "Create"}
                  </h2>
                  {/* <h2 className="text-sm">{displayHistoryItemType(item.type)}</h2> */}
                  {item.parentIndex !== null &&
                  item.parentIndex !== index - 1 ? (
                    <h2 className="text-sm">
                      (parent: v{(item.parentIndex || 0) + 1})
                    </h2>
                  ) : null}
                </div>
                <h2 className="text-sm">v{index + 1}</h2>
              </HoverCardTrigger>
              <HoverCardContent>
                <div>
                  {item.type === "ai_edit" ? item.inputs.prompt : "Create"}
                </div>
                <Badge>{displayHistoryItemType(item.type)}</Badge>
              </HoverCardContent>
            </HoverCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
