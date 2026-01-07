import { useProjectStore } from "../../store/project-store";
import Spinner from "../core/Spinner";
import { useEffect, useRef, useState } from "react";
import { useThrottle } from "../../hooks/useThrottle";

const IFRAME_WIDTH = 1280;
const IFRAME_HEIGHT = 800;

interface VariantThumbnailProps {
  code: string;
  isSelected: boolean;
}

function VariantThumbnail({ code, isSelected }: VariantThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.1);

  // Selected variant updates every 300ms, non-selected every 2000ms
  const throttledCode = useThrottle(code, isSelected ? 300 : 2000);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.offsetWidth;
      setScale(containerWidth / IFRAME_WIDTH);
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = throttledCode;
    }
  }, [throttledCode]);

  const scaledHeight = IFRAME_HEIGHT * scale;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900"
      style={{ height: `${scaledHeight}px` }}
    >
      <iframe
        ref={iframeRef}
        title="variant-preview"
        className="pointer-events-none origin-top-left"
        style={{
          width: `${IFRAME_WIDTH}px`,
          height: `${IFRAME_HEIGHT}px`,
          transform: `scale(${scale})`,
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

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
      return "grid grid-cols-2 gap-2";
    } else if (variantCount === 3) {
      return "grid grid-cols-2 gap-2"; // 2 columns, 3rd variant wraps below
    } else if (variantCount === 4) {
      return "grid grid-cols-2 gap-2"; // 2x2 grid
    } else if (variantCount <= 6) {
      return "grid grid-cols-3 gap-2"; // 3x2 grid
    } else {
      return "grid grid-cols-4 gap-2"; // 4x? grid for larger counts
    }
  };

  return (
    <div className="mt-4 mb-4">
      <div className={getGridClass(variants.length)}>
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
                  ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => handleVariantClick(index)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium flex items-center text-sm">
                  Option {index + 1}
                  {variant.status === "generating" && (
                    <div className="scale-75 ml-1">
                      <Spinner />
                    </div>
                  )}
                  {statusIndicator}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  ⌥{index + 1}
                </span>
              </div>
              <VariantThumbnail
                code={variant.code}
                isSelected={index === selectedVariantIndex}
              />
              {(variant.status === "cancelled" || variant.status === "error") && (
                <div className="text-xs mt-1 flex items-center">
                  {variant.status === "cancelled" && (
                    <span className="text-gray-500">Cancelled</span>
                  )}
                  {variant.status === "error" && (
                    <span className="text-red-500">Error</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Variants;
