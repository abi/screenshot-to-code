import { useProjectStore } from "../../store/project-store";
import Spinner from "../core/Spinner";
import { useEffect } from "react";

function Variants() {
  const { inputMode, head, commits, updateSelectedVariantIndex } =
    useProjectStore();

  // Get commit data safely
  const commit = head ? commits[head] : null;
  const variants = commit?.variants || [];
  const selectedVariantIndex = commit?.selectedVariantIndex || 0;

  const handleVariantClick = (index: number) => {
    // Don't do anything if this is already the selected variant or no head
    if (index === selectedVariantIndex || !head) return;

    // First update the UI to show we're switching variants
    updateSelectedVariantIndex(head, index);
  };

  // Add keyboard shortcuts for variant switching - MUST be before any early returns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Option + number keys 1-9 using key codes (works even when in input fields)
      if (event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
        // Use event.code to get the physical key, not the character it produces
        const code = event.code;
        if (code >= "Digit1" && code <= "Digit9") {
          const variantIndex = parseInt(code.replace("Digit", "")) - 1;

          // Only switch if the variant exists and component is visible
          if (
            commit &&
            variantIndex < variants.length &&
            variants.length > 1 &&
            !commit.isCommitted
          ) {
            event.preventDefault();
            handleVariantClick(variantIndex);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [variants.length, commit?.isCommitted, selectedVariantIndex, head]);

  // Early returns after all hooks
  // If there is no head, don't show the variants
  if (head === null || !commit) {
    return null;
  }

  // If there is only one variant or the commit is already committed, don't show the variants
  if (variants.length <= 1 || commit.isCommitted || inputMode === "video") {
    return <div className="mt-2"></div>;
  }

  // Dynamic grid layout based on variant count
  const getGridClass = (variantCount: number) => {
    if (variantCount <= 2) {
      return "grid grid-cols-2 gap-3";
    } else if (variantCount === 3) {
      return "grid grid-cols-2 gap-3";
    } else if (variantCount === 4) {
      return "grid grid-cols-2 gap-3";
    } else if (variantCount <= 6) {
      return "grid grid-cols-3 gap-3";
    } else {
      return "grid grid-cols-4 gap-3";
    }
  };

  return (
    <div className="mt-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Generated Options
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent"></div>
      </div>
      <div className={getGridClass(variants.length)}>
        {variants.map((variant, index) => {
          const isSelected = index === selectedVariantIndex;
          const isComplete = variant.status === "complete";
          const isError = variant.status === "error";
          const isCancelled = variant.status === "cancelled";
          const isGenerating = variant.status === "generating";

          return (
            <div
              key={index}
              className={`
                relative p-3 rounded-xl cursor-pointer transition-all duration-200 ease-out
                border-2
                ${isSelected
                  ? "bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border-indigo-400 dark:border-indigo-500 shadow-md shadow-indigo-500/10"
                  : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md"
                }
                ${isError ? "border-red-300 dark:border-red-700" : ""}
              `}
              onClick={() => handleVariantClick(index)}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span className={`
                    ${isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200"}
                  `}>
                    Option {index + 1}
                  </span>
                  {isGenerating && (
                    <div className="scale-75">
                      <Spinner />
                    </div>
                  )}
                  {isComplete && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 shadow-sm">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {isCancelled && (
                    <span className="inline-block w-3 h-3 bg-slate-400 rounded-full" title="Cancelled"></span>
                  )}
                  {isError && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 shadow-sm">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </h3>
                <span className={`
                  text-[10px] font-mono px-1.5 py-0.5 rounded-md transition-colors
                  ${isSelected
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                  }
                `}>
                  {index + 1}
                </span>
              </div>
              {(isCancelled || isError) && (
                <div className="text-xs mt-1.5">
                  {isCancelled && (
                    <span className="text-slate-400 dark:text-slate-500">Cancelled</span>
                  )}
                  {isError && (
                    <span className="text-red-500 dark:text-red-400">Error occurred</span>
                  )}
                </div>
              )}
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-px -left-px -right-px h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-xl"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Variants;
