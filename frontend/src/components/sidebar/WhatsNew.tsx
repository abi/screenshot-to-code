import { useState } from "react";
import { LuGift, LuImagePlus } from "react-icons/lu";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { addEvent } from "../../lib/analytics";
import { useStore } from "../../store/store";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import { SAAS_BACKEND_URL } from "../../config";

// Bump when entries change so the unseen dot reappears for everyone. Seen
// state is per-account on the saas backend (users.whats_new_seen_version),
// delivered with the user on bootstrap; this is just the current version we
// compare against.
const WHATS_NEW_VERSION = "2026-06-30";

const ENTRIES = [
  {
    icon: LuImagePlus,
    title: "Real assets from screenshots",
    description:
      "Screenshot to Code now extracts the actual images and assets from your screenshot. If they are not quite right, ask AI to generate replacements or upload your own.",
  },
];

function WhatsNew() {
  const [isOpen, setIsOpen] = useState(false);
  const seenVersion = useStore((s) => s.whatsNewSeenVersion);
  const hasLoaded = useStore((s) => s.hasLoadedWhatsNew);
  const setSeenVersion = useStore((s) => s.setWhatsNewSeenVersion);
  const authenticatedFetch = useAuthenticatedFetch();

  // Only nag once we know the account's state, so the dot doesn't flash
  // before the user fetch resolves.
  const hasUnseen = hasLoaded && seenVersion !== WHATS_NEW_VERSION;

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && hasUnseen) {
      addEvent("What's New: Open", { version: WHATS_NEW_VERSION });
      // Optimistically clear the dot, then persist per-account. Fire-and-forget:
      // if it fails the dot just returns on the next load.
      setSeenVersion(WHATS_NEW_VERSION);
      if (SAAS_BACKEND_URL) {
        authenticatedFetch(SAAS_BACKEND_URL + "/users/whats-new/seen", "POST", {
          version: WHATS_NEW_VERSION,
        }).catch(() => {
          // non-critical
        });
      }
    } else if (open) {
      // Already caught up - still record the open for engagement analytics.
      addEvent("What's New: Open", { version: WHATS_NEW_VERSION });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          data-testid="whats-new-toggle"
          className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
            isOpen
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          }`}
          title="What's new"
        >
          <span className="relative">
            <LuGift className="w-[18px] h-[18px]" />
            {hasUnseen && (
              <span
                data-testid="whats-new-dot"
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-500"
              />
            )}
          </span>
          <span className="hidden text-[10px] leading-none lg:block">
            What's new
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={10}
        className="w-80 p-0 overflow-hidden dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            What's new
          </h2>
        </div>
        <ul className="px-1 py-1">
          {ENTRIES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-3 rounded-lg px-3 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-gray-900 dark:text-zinc-100">
                  {title}
                </span>
                <span className="block text-xs leading-snug text-gray-500 dark:text-zinc-400">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default WhatsNew;
