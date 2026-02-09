import { LuClock, LuSettings } from "react-icons/lu";
import SettingsDialog from "../settings/SettingsDialog";
import { Settings } from "../../types";

interface IconStripProps {
  isHistoryOpen: boolean;
  showHistory: boolean;
  onToggleHistory: () => void;
  onLogoClick: () => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

function IconStrip({
  isHistoryOpen,
  showHistory,
  onToggleHistory,
  onLogoClick,
  settings,
  setSettings,
}: IconStripProps) {
  return (
    <div className="flex h-full flex-col items-center w-14 py-5 gap-y-1 border-r border-gray-200 bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800">
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="mb-4 rounded-lg p-1 transition-colors hover:bg-gray-200/70 dark:hover:bg-zinc-800"
        title="Home"
      >
        <img
          src="/favicon/main.png"
          alt="Logo"
          className="w-5 h-5"
        />
      </button>

      {/* History */}
      {showHistory && (
        <button
          onClick={onToggleHistory}
          className={`p-2.5 rounded-lg transition-colors ${
            isHistoryOpen
              ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
          title="History"
        >
          <LuClock className="w-[18px] h-[18px]" />
        </button>
      )}

      {/* Spacer pushes settings to bottom */}
      <div className="flex-1" />

      {/* Settings */}
      <SettingsDialog
        settings={settings}
        setSettings={setSettings}
        trigger={
          <button
            className="p-2.5 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-gray-200"
            title="Settings"
          >
            <LuSettings className="w-[18px] h-[18px]" />
          </button>
        }
      />
    </div>
  );
}

export default IconStrip;
