import { LuMousePointerClick, LuX } from "react-icons/lu";
import { useAppStore } from "../../store/app-store";
import { addEvent } from "../../lib/analytics";

// Select-and-edit toggle in the preview toolbar, next to the device/code
// tabs — the "inspect element" spot users know from devtools. While select
// mode is on it becomes an explicit exit button.
export function SelectAndEditToolbarButton() {
  const { inSelectAndEditMode, toggleInSelectAndEditMode } = useAppStore();
  return (
    <button
      type="button"
      onClick={() => {
        if (!inSelectAndEditMode) {
          addEvent("Select and Edit: Enter", { source: "preview-toolbar" });
        }
        toggleInSelectAndEditMode();
      }}
      data-testid="select-edit-toggle"
      title={
        inSelectAndEditMode
          ? "Exit selection mode"
          : "Select an element in the preview to target your edit"
      }
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
        inSelectAndEditMode
          ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700"
          : "bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-500 dark:hover:text-violet-300"
      }`}
    >
      {inSelectAndEditMode ? (
        <>
          <LuX className="w-3.5 h-3.5" />
          Exit select mode
        </>
      ) : (
        <>
          <LuMousePointerClick className="w-3.5 h-3.5" />
          Select & edit
        </>
      )}
    </button>
  );
}
