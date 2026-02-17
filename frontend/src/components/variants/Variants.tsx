import { useProjectStore } from "../../store/project-store";
import Spinner from "../core/Spinner";
import { useEffect, useRef, useState } from "react";
import { useThrottle } from "../../hooks/useThrottle";
import {
  CODE_GENERATION_MODEL_DESCRIPTIONS,
  CodeGenerationModel,
} from "../../lib/models";

const IFRAME_WIDTH = 1280;
const IFRAME_HEIGHT = 550;

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
    <div className="pt-2 pb-1">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((variant, index) => {
          let statusColor = "bg-gray-300 dark:bg-gray-600";
          if (variant.status === "complete") statusColor = "bg-green-500";
          else if (variant.status === "error" || variant.status === "cancelled") statusColor = "bg-red-500";

          return (
            <div
              key={index}
              className={`w-full rounded cursor-pointer overflow-hidden ${
                index === selectedVariantIndex
                  ? "ring-2 ring-blue-400 dark:ring-blue-500"
                  : "ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-gray-300 dark:hover:ring-gray-600"
              }`}
              title={variant.model ? (CODE_GENERATION_MODEL_DESCRIPTIONS[variant.model as CodeGenerationModel]?.name || variant.model) : undefined}
              onClick={() => handleVariantClick(index)}
            >
              <VariantThumbnail
                code={variant.code}
                isSelected={index === selectedVariantIndex}
              />
              <div className="flex items-center px-2 py-1 bg-white dark:bg-zinc-900">
                <span className="inline-flex min-w-0 items-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${statusColor}`} />
                  Option {index + 1}
                </span>
                {variant.status === "generating" && (
                  <div className="ml-auto shrink-0 scale-75">
                    <Spinner />
                  </div>
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
