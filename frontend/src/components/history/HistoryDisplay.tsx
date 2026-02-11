import toast from "react-hot-toast";
import { renderHistory } from "./utils";
import { useProjectStore } from "../../store/project-store";
import { BsChevronDown, BsChevronRight } from "react-icons/bs";
import { useState } from "react";

interface Props {
  shouldDisableReverts: boolean;
}

export default function HistoryDisplay({ shouldDisableReverts }: Props) {
  const { commits, head, setHead } = useProjectStore();
  const [expandedHash, setExpandedHash] = useState<string | null>(null);

  // Put all commits into an array and sort by created date (oldest first)
  const flatHistory = Object.values(commits).sort(
    (a, b) =>
      new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
  );

  // Annotate history items with a summary, parent version, etc.
  const renderedHistory = renderHistory(flatHistory);

  if (renderedHistory.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {[...renderedHistory].reverse().map((item, _reverseIndex) => {
        const versionNumber = renderedHistory.length - _reverseIndex;
        const isActive = item.hash === head;
        const isExpanded = expandedHash === item.hash;

        return (
          <div
            key={item.hash}
            className={`rounded-lg transition-colors ${
              isActive
                ? "bg-gray-100 dark:bg-zinc-800"
                : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <div
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              onClick={() =>
                shouldDisableReverts
                  ? toast.error(
                      "Please wait for code generation to complete before viewing an older version."
                    )
                  : setHead(item.hash)
              }
            >
              {/* Version number badge */}
              <span
                className={`shrink-0 text-xs font-medium ${
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                v{versionNumber}
              </span>

              {/* Summary */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${
                    isActive
                      ? "font-medium text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {item.summary}
                </p>
                {item.parentVersion !== null && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    from v{item.parentVersion}
                  </p>
                )}
              </div>

              {/* Type label + expand */}
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {item.type}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedHash(isExpanded ? null : item.hash);
                }}
                className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
              >
                {isExpanded ? (
                  <BsChevronDown className="w-3 h-3" />
                ) : (
                  <BsChevronRight className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-3 pb-2.5 pl-12">
                <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                  {item.summary}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
