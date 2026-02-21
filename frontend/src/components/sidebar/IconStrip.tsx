import { LuClock, LuCode, LuSettings, LuPlus } from "react-icons/lu";

interface IconStripProps {
  isHistoryOpen: boolean;
  isEditorOpen: boolean;
  isSettingsOpen: boolean;
  showHistory: boolean;
  showEditor: boolean;
  onToggleHistory: () => void;
  onToggleEditor: () => void;
  onLogoClick: () => void;
  onNewProject: () => void;
  onOpenSettings: () => void;
}

function IconStrip({
  isHistoryOpen,
  isEditorOpen,
  isSettingsOpen,
  showHistory,
  showEditor,
  onToggleHistory,
  onToggleEditor,
  onLogoClick,
  onNewProject,
  onOpenSettings,
}: IconStripProps) {
  return (
    <div className="flex w-full items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900 lg:h-full lg:w-16 lg:flex-col lg:items-center lg:gap-y-3 lg:border-b-0 lg:border-r lg:px-0 lg:py-4">
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="rounded-lg p-2 transition-colors hover:bg-gray-200/70 dark:hover:bg-zinc-800 lg:mb-2 lg:p-1"
      >
        <img
          src="/favicon/main.png"
          alt="Logo"
          className="w-5 h-5 dark:invert"
        />
      </button>

      <div className="flex items-center gap-1 lg:flex-col lg:gap-0 lg:contents">
        {/* Editor */}
        {showEditor && (
          <button
            onClick={onToggleEditor}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
              isEditorOpen
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Editor"
          >
            <LuCode className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Editor</span>
          </button>
        )}

        {/* Versions */}
        {showHistory && (
          <button
            onClick={onToggleHistory}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
              isHistoryOpen
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Versions"
          >
            <LuClock className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Versions</span>
          </button>
        )}

        <button
          onClick={onNewProject}
          className="flex items-center justify-center rounded-lg p-2 transition-colors bg-violet-100 text-violet-700 hover:bg-violet-200 lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 dark:bg-violet-900/40 dark:text-violet-200 dark:hover:bg-violet-900/60"
          title="Start a new project"
        >
          <LuPlus className="w-[18px] h-[18px]" />
          <span className="hidden text-[10px] leading-none lg:block font-medium">New</span>
        </button>
      </div>

      {/* Spacer pushes settings to bottom */}
      <div className="hidden flex-1 lg:block" />

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
          isSettingsOpen
            ? "text-gray-900 dark:text-white"
            : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        }`}
        title="Settings"
      >
        <LuSettings className="w-[18px] h-[18px]" />
        <span className="hidden text-[10px] leading-none lg:block">Settings</span>
      </button>
    </div>
  );
}

export default IconStrip;
