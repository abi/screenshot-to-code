import toast from "react-hot-toast";
import classNames from "classnames";

import { Badge } from "../ui/badge";
import { summarizeHistoryItem } from "./utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Button } from "../ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { useProjectStore } from "../../store/project-store";

interface Props {
  shouldDisableReverts: boolean;
}

export default function HistoryDisplay({ shouldDisableReverts }: Props) {
  const { commits, head, setHead } = useProjectStore();

  // TODO: Clean this up

  const newHistory = Object.values(commits).flatMap((commit) => {
    if (commit.type === "ai_create" || commit.type === "ai_edit") {
      return {
        type: commit.type,
        hash: commit.hash,
        summary: summarizeHistoryItem(commit),
        parentHash: commit.parentHash,
        code: commit.variants[commit.selectedVariantIndex].code,
        inputs: commit.inputs,
        date_created: commit.date_created,
      };
    }
    return [];
  });

  // Sort by date created
  newHistory.sort(
    (a, b) =>
      new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
  );

  const setParentVersion = (
    parentHash: string | null,
    currentHash: string | null
  ) => {
    if (!parentHash) return null;
    const parentIndex = newHistory.findIndex(
      (item) => item.hash === parentHash
    );
    const currentIndex = newHistory.findIndex(
      (item) => item.hash === currentHash
    );
    return parentIndex !== -1 && parentIndex != currentIndex - 1
      ? parentIndex + 1
      : null;
  };

  // Update newHistory to include the parent version
  const updatedHistory = newHistory.map((item) => ({
    ...item,
    parentVersion: setParentVersion(item.parentHash, item.hash),
  }));

  return updatedHistory.length === 0 ? null : (
    <div className="flex flex-col h-screen">
      <h1 className="font-bold mb-2">Versions</h1>
      <ul className="space-y-0 flex flex-col-reverse">
        {updatedHistory.map((item, index) => (
          <li key={index}>
            <Collapsible>
              <div
                className={classNames(
                  "flex items-center justify-between space-x-2 w-full pr-2",
                  "border-b cursor-pointer",
                  {
                    " hover:bg-black hover:text-white": item.hash === head,
                    "bg-slate-500 text-white": item.hash === head,
                  }
                )}
              >
                <div
                  className="flex justify-between truncate flex-1 p-2"
                  onClick={() =>
                    shouldDisableReverts
                      ? toast.error(
                          "Please wait for code generation to complete before viewing an older version."
                        )
                      : setHead(item.hash)
                  }
                >
                  <div className="flex gap-x-1 truncate">
                    <h2 className="text-sm truncate">{item.summary}</h2>
                    {item.parentVersion !== null && (
                      <h2 className="text-sm">
                        (parent: v{item.parentVersion})
                      </h2>
                    )}
                  </div>
                  <h2 className="text-sm">v{index + 1}</h2>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6">
                    <CaretSortIcon className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="w-full bg-slate-300 p-2">
                <div>Full prompt: {item.summary}</div>
                <div className="flex justify-end">
                  <Badge>{item.type}</Badge>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </li>
        ))}
      </ul>
    </div>
  );
}
