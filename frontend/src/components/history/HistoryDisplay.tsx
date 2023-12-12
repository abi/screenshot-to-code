import { History } from "./history_types";
import toast from "react-hot-toast";
import classNames from "classnames";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "../ui/hover-card";
import { Badge } from "../ui/badge";
import { renderHistory } from "./utils";

interface Props {
  history: History;
  currentVersion: number | null;
  revertToVersion: (version: number) => void;
  shouldDisableReverts: boolean;
}

export default function HistoryDisplay({
  history,
  currentVersion,
  revertToVersion,
  shouldDisableReverts,
}: Props) {
  const renderedHistory = renderHistory(history, currentVersion);

  return renderedHistory.length === 0 ? null : (
    <div className="flex flex-col h-screen">
      <h1 className="font-bold mb-2">Versions</h1>
      <ul className="space-y-0 flex flex-col-reverse">
        {renderedHistory.map((item, index) => (
          <li key={index}>
            <HoverCard>
              <HoverCardTrigger
                className={classNames(
                  "flex items-center justify-between space-x-2 p-2",
                  "border-b cursor-pointer",
                  {
                    " hover:bg-black hover:text-white": !item.isActive,
                    "bg-slate-500 text-white": item.isActive,
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
                  <h2 className="text-sm truncate">{item.summary}</h2>
                  {item.parentVersion !== null && (
                    <h2 className="text-sm">(parent: {item.parentVersion})</h2>
                  )}
                </div>
                <h2 className="text-sm">v{index + 1}</h2>
              </HoverCardTrigger>
              <HoverCardContent>
                <div>{item.summary}</div>
                <Badge>{item.type}</Badge>
              </HoverCardContent>
            </HoverCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
