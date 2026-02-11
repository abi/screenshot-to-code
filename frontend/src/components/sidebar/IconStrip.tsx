import { LuClock, LuCode, LuSettings } from "react-icons/lu";
import SettingsDialog from "../settings/SettingsDialog";
import { Settings } from "../../types";

interface IconStripProps {
  isHistoryOpen: boolean;
  isEditorOpen: boolean;
  showHistory: boolean;
  showEditor: boolean;
  onToggleHistory: () => void;
  onToggleEditor: () => void;
  onLogoClick: () => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

function IconStrip({
  isHistoryOpen,
  isEditorOpen,
  showHistory,
  showEditor,
  onToggleHistory,
  onToggleEditor,
  onLogoClick,
  settings,
  setSettings,
}: IconStripProps) {
  return (
    <div className="flex h-full flex-col items-center w-16 py-4 gap-y-3 border-r border-gray-200 bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800">
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="mb-2 rounded-lg p-1 transition-colors hover:bg-gray-200/70 dark:hover:bg-zinc-800"
      >
        <img
          src="/favicon/main.png"
          alt="Logo"
          className="w-5 h-5"
        />
      </button>

      {/* Editor */}
      {showEditor && (
        <button
          onClick={onToggleEditor}
          className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
            isEditorOpen
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <LuCode className="w-[18px] h-[18px]" />
          <span className="text-[10px] leading-none">Editor</span>
        </button>
      )}

      {/* History */}
      {showHistory && (
        <button
          onClick={onToggleHistory}
          className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
            isHistoryOpen
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <LuClock className="w-[18px] h-[18px]" />
          <span className="text-[10px] leading-none">History</span>
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
            className="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <LuSettings className="w-[18px] h-[18px]" />
            <span className="text-[10px] leading-none">Settings</span>
          </button>
        }
      />
    </div>
  );
}

export default IconStrip;
