import { useProjectStore } from "../../store/project-store";
import Spinner from "../core/Spinner";
import { useEffect } from "react";

function Variants() {
  const { inputMode, head, commits, updateSelectedVariantIndex } =
    useProjectStore();

  // If there is no head, don't show the variants
  if (head === null) {
    return null;
  }

  const commit = commits[head];
  const variants = commit.variants;
  const selectedVariantIndex = commit.selectedVariantIndex;

  // If there is only one variant or the commit is already committed, don't show the variants
  if (variants.length <= 1 || commit.isCommitted || inputMode === "video") {
    return <div className="mt-2"></div>;
  }

  const handleVariantClick = (index: number) => {
    // Don't do anything if this is already the selected variant
    if (index === selectedVariantIndex) return;

    // First update the UI to show we're switching variants
    updateSelectedVariantIndex(head, index);
  };

  // Add keyboard shortcuts for variant switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle number keys when not in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Handle number keys 1-9
      const key = event.key;
      if (key >= "1" && key <= "9") {
        const variantIndex = parseInt(key) - 1;
        
        // Only switch if the variant exists and component is visible
        if (
          variantIndex < variants.length &&
          variants.length > 1 &&
          !commit.isCommitted
        ) {
          event.preventDefault();
          handleVariantClick(variantIndex);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [variants.length, commit.isCommitted, selectedVariantIndex, head]);

  return (
    <div className="mt-4 mb-4">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((variant, index) => {
          // Determine the status indicator
          let statusIndicator = null;
          if (variant.status === "complete") {
            statusIndicator = (
              <span
                className="inline-block w-2 h-2 bg-green-500 rounded-full ml-2"
                title="Complete"
              ></span>
            );
          } else if (variant.status === "cancelled") {
            statusIndicator = (
              <span
                className="inline-block w-2 h-2 bg-red-500 rounded-full ml-2"
                title="Cancelled"
              ></span>
            );
          } else if (variant.status === "error") {
            statusIndicator = (
              <span
                className="inline-block w-2 h-2 bg-red-600 rounded-full ml-2"
                title="Error"
              ></span>
            );
          }

          return (
            <div
              key={index}
              className={`p-2 border rounded-md cursor-pointer ${
                index === selectedVariantIndex
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => handleVariantClick(index)}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-medium flex items-center">
                  Option {index + 1}
                  {variant.status === "generating" && (
                    <div className="scale-75 ml-2">
                      <Spinner />
                    </div>
                  )}
                  {statusIndicator}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
              </div>
              <div className="text-xs mt-1 flex items-center">
                {variant.status === "cancelled" && (
                  <span className="text-gray-500">Cancelled</span>
                )}
                {variant.status === "error" && (
                  <span className="text-red-500">Error</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Variants;
