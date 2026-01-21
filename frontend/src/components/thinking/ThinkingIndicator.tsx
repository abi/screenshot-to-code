import { useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { BsChevronDown, BsChevronRight } from "react-icons/bs";
import ReactMarkdown from "react-markdown";

function getLastSentence(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i].trim();
    if (sentence.length > 0) {
      if (sentence.length > 150) {
        return "..." + sentence.slice(-150);
      }
      return sentence;
    }
  }
  return text.length > 100 ? "..." + text.slice(-100) : text;
}

function ThinkingIndicator() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { head, commits, latestCommitHash } = useProjectStore();

  const currentCommit = head ? commits[head] : null;
  const selectedVariant = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex]
    : null;
  const thinking = selectedVariant?.thinking || "";
  const code = selectedVariant?.code || "";
  const thinkingDuration = selectedVariant?.thinkingDuration;
  const isGenerating = selectedVariant?.status === "generating";

  // UI States:
  // - Waiting: isGenerating && !code && !thinking -> "AI is thinking..."
  // - Thinking: thinking && !code -> "AI Thinking" with content + pulsing
  // - Complete: thinking && code -> "AI thought for Xs" with content
  // - Hidden: !isGenerating && !thinking -> not rendered

  const isWaiting = isGenerating && !code && !thinking;
  const isThinkingInProgress = thinking.length > 0 && code.length === 0;
  const isThinkingComplete = thinking.length > 0 && code.length > 0;

  // Only show thinking for the latest commit, not historical ones
  const isLatestCommit = head === latestCommitHash;

  // Don't render if there's no thinking content and we're not in the waiting state
  if (!thinking && !isWaiting) {
    return null;
  }

  // Don't show thinking for historical commits
  if (!isLatestCommit) {
    return null;
  }

  // Determine header text
  let headerText = "AI Thinking";
  if (isWaiting) {
    headerText = "AI is thinking...";
  } else if (isThinkingComplete && thinkingDuration !== undefined) {
    headerText = `AI thought for ${thinkingDuration}s`;
  }

  const previewText = thinking ? getLastSentence(thinking) : "";

  const isActive = isWaiting || isThinkingInProgress;

  return (
    <div
      className={`rounded-md mb-2 ${
        isActive
          ? "border-2 border-green-400 dark:border-green-500"
          : "bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
      }`}
      style={
        isActive
          ? {
              animation: "flash 1s ease-in-out infinite",
            }
          : undefined
      }
    >
      <style>
        {`
          @keyframes flash {
            0%, 100% {
              background-color: rgb(240 253 244);
              border-color: rgb(74 222 128);
            }
            50% {
              background-color: rgb(187 247 208);
              border-color: rgb(34 197 94);
            }
          }
          @media (prefers-color-scheme: dark) {
            @keyframes flash {
              0%, 100% {
                background-color: rgb(20 83 45 / 0.3);
                border-color: rgb(34 197 94);
              }
              50% {
                background-color: rgb(20 83 45 / 0.6);
                border-color: rgb(74 222 128);
              }
            }
          }
        `}
      </style>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors rounded-t-md"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <BsChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          ) : (
            <BsChevronRight className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {headerText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(isWaiting || isThinkingInProgress) && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">
                {isWaiting ? "starting" : "reasoning"}
              </span>
            </span>
          )}
        </div>
      </button>

      {thinking && (
        <>
          {isExpanded ? (
            <div className="px-3 pb-3 max-h-60 overflow-y-auto">
              <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{thinking}</ReactMarkdown>
              </div>
            </div>
          ) : (
            // Only show preview when thinking is in progress, not when complete
            isThinkingInProgress && (
              <div className="px-3 pb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {previewText}
                </p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

export default ThinkingIndicator;
