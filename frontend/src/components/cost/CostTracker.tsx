import { useMemo } from "react";
import { useProjectStore } from "../../store/project-store";

interface CostTrackerProps {
  /** Collapse to a single-row summary instead of the full breakdown. */
  compact?: boolean;
}

/**
 * Displays the accumulated cost for all variants of the current (head) commit.
 *
 * Data flows from the WebSocket pipeline:
 *   variantCost message → generateCode.ts → App.tsx → setVariantCost → project-store
 *   → CostTracker reads variants[].costUsd
 *
 * This component is only shown when `settings.showCostTracker` is true (gated in
 * PreviewPane).  Opt-in keeps the default UI clean for users who don't care about
 * cost monitoring.
 */
export function CostTracker({ compact }: CostTrackerProps) {
  const { head, commits } = useProjectStore();

  const variants = useMemo(() => {
    if (!head || !commits[head]) return [];
    return commits[head].variants;
  }, [head, commits]);

  const hasCostData = variants.some((v) => v.costUsd !== undefined);
  if (!hasCostData) return null;

  const total = variants.reduce((sum, v) => sum + (v.costUsd ?? 0), 0);
  const maxCost = Math.max(...variants.map((v) => v.costUsd ?? 0), 0.001);

  if (compact) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {variants.length > 1 && (
          <span className="mr-1">
            {variants.filter((v) => v.costUsd !== undefined).length}/{variants.length}
          </span>
        )}
        ${total.toFixed(4)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-4 py-2 border-t border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          Cost breakdown
        </span>
        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 tabular-nums">
          ${total.toFixed(4)}
        </span>
      </div>
      <div className="flex gap-1.5">
        {variants.map((variant, i) => {
          const cost = variant.costUsd ?? 0;
          const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">
                  {i + 1}
                  {variant.model ? ` · ${variant.model.split("-").slice(0, 2).join("-")}` : ""}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 tabular-nums ml-1 shrink-0">
                  ${cost.toFixed(4)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-400 dark:bg-violet-600 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
