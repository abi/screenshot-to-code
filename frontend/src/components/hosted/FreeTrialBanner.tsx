import { FaGift } from "react-icons/fa";

interface FreeTrialBannerProps {
  used: number;
  limit: number;
}

export default function FreeTrialBanner({ used, limit }: FreeTrialBannerProps) {
  const remaining = Math.max(limit - used, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-blue-50 px-4 py-3.5 shadow-sm dark:border-violet-500/30 dark:from-violet-950/40 dark:via-zinc-900 dark:to-blue-950/30">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-300/30 blur-2xl dark:bg-violet-500/20" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-sm">
          <FaGift className="text-base" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Your first generation is on us
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            Turn any screenshot, mockup, or idea into code — free.
          </p>
        </div>
        {remaining > 0 && (
          <span className="shrink-0 rounded-full border border-violet-200 bg-white/70 px-2.5 py-1 text-xs font-bold text-violet-700 dark:border-violet-500/40 dark:bg-zinc-900/50 dark:text-violet-300">
            {remaining} free
          </span>
        )}
      </div>
    </div>
  );
}
