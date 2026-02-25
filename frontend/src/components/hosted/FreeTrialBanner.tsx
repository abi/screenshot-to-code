import { useStore } from "../../store/store";

interface FreeTrialBannerProps {
  used: number;
  limit: number;
}

export default function FreeTrialBanner({ used, limit }: FreeTrialBannerProps) {
  const setPricingDialogOpen = useStore(
    (state) => state.setPricingDialogOpen,
  );
  const remaining = limit - used;
  const progress = used / limit;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-zinc-200">
          {remaining} free generation{remaining !== 1 ? "s" : ""} remaining
        </span>
        <button
          onClick={() => setPricingDialogOpen(true)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Upgrade
        </button>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
        {used} of {limit} used
      </p>
    </div>
  );
}
