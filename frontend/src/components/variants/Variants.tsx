import { useProjectStore } from "../../store/project-store";
import Spinner from "../core/Spinner";
import { useEffect, useRef, useState } from "react";
import { useThrottle } from "../../hooks/useThrottle";
import {
  CODE_GENERATION_MODEL_DESCRIPTIONS,
  CodeGenerationModel,
} from "../../lib/models";

const IFRAME_WIDTH = 1280;
const IFRAME_HEIGHT = 400;

interface VariantThumbnailProps {
  code: string;
  isSelected: boolean;
}

function VariantThumbnail({ code, isSelected }: VariantThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.1);

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
  const { head, commits, updateSelectedVariantIndex } = useProjectStore();

  const commit = head ? commits[head] : null;
  const variants = commit?.variants || [];
  const selectedVariantIndex = commit?.selectedVariantIndex || 0;

  const handleVariantClick = (index: number) => {
    if (index === selectedVariantIndex || !head) return;
    updateSelectedVariantIndex(head, index);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
        const code = event.code;
        if (code >= "Digit1" && code <= "Digit9") {
          const variantIndex = parseInt(code.replace("Digit", "")) - 1;
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

  if (head === null || !commit) {
    return null;
  }

  if (variants.length <= 1 || commit.isCommitted) {
    return <div className="mt-2"></div>;
  }

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 pt-2 pb-2 -mx-6 px-6">
      <div className="grid grid-cols-2 gap-1">
        {variants.map((variant, index) => {
          let statusColor = "bg-gray-300 dark:bg-gray-600";
          if (variant.status === "complete") statusColor = "bg-green-500";
          else if (variant.status === "error" || variant.status === "cancelled") statusColor = "bg-red-500";

          return (
            <div
              key={index}
              className={`p-1 border rounded cursor-pointer ${
                index === selectedVariantIndex
                  ? "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
              }`}
              title={variant.model ? (CODE_GENERATION_MODEL_DESCRIPTIONS[variant.model as CodeGenerationModel]?.name || variant.model) : undefined}
              onClick={() => handleVariantClick(index)}
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="flex items-center text-[10px] text-gray-500 dark:text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColor}`} />
                  Option {index + 1}
                  {variant.status === "generating" && (
                    <div className="scale-50 ml-0.5">
                      <Spinner />
                    </div>
                  )}
                </span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                  ⌥{index + 1}
                </span>
              </div>
              <VariantThumbnail
                code={variant.code}
                isSelected={index === selectedVariantIndex}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Variants;
