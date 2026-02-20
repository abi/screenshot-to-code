import {
  LuClock,
  LuCode,
  LuFolderOpen,
  LuSettings,
  LuPlus,
  LuGift,
  LuMessageCircle,
} from "react-icons/lu";
import { useUser } from "@clerk/clerk-react";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import SettingsDialog from "../settings/SettingsDialog";
import { Settings } from "../../types";

interface IconStripProps {
  isVersionsOpen: boolean;
  isProjectsOpen: boolean;
  isEditorOpen: boolean;
  showVersions: boolean;
  showProjects: boolean;
  showAccount: boolean;
  showEditor: boolean;
  onToggleVersions: () => void;
  onToggleProjects: () => void;
  onToggleAccount: () => void;
  onToggleEditor: () => void;
  onLogoClick: () => void;
  onNewProject: () => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  onOpenFeedback?: () => void;
  onContactSupport?: () => void;
}

function IconStrip({
  isVersionsOpen,
  isProjectsOpen,
  isEditorOpen,
  showVersions,
  showProjects,
  showAccount,
  showEditor,
  onToggleVersions,
  onToggleProjects,
  onToggleAccount,
  onToggleEditor,
  onLogoClick,
  onNewProject,
  settings,
  setSettings,
  onOpenFeedback,
  onContactSupport,
}: IconStripProps) {
  const { user } = useUser();

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
        {showVersions && (
          <button
            onClick={onToggleVersions}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
              isVersionsOpen
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Versions"
          >
            <LuClock className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Versions</span>
          </button>
        )}

        {/* Projects */}
        {showProjects && (
          <button
            onClick={onToggleProjects}
            className={`flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5 ${
              isProjectsOpen
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Projects"
          >
            <LuFolderOpen className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Projects</span>
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

      {onOpenFeedback && (
        <button
          onClick={onOpenFeedback}
          className="flex items-center justify-center rounded-lg p-2 transition-colors text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5"
          title="Get $200 for feedback"
        >
          <LuGift className="w-[18px] h-[18px]" />
          <span className="hidden text-[10px] leading-none lg:block">Feedback</span>
        </button>
      )}

      {onContactSupport && (
        <button
          onClick={onContactSupport}
          className="flex items-center justify-center rounded-lg p-2 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5"
          title="Contact support"
        >
          <LuMessageCircle className="w-[18px] h-[18px]" />
          <span className="hidden text-[10px] leading-none lg:block">Support</span>
        </button>
      )}

      {/* Settings */}
      <SettingsDialog
        settings={settings}
        setSettings={setSettings}
        trigger={
          <button
            className="flex items-center justify-center rounded-lg p-2 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5"
            title="Settings"
          >
            <LuSettings className="w-[18px] h-[18px]" />
            <span className="hidden text-[10px] leading-none lg:block">Settings</span>
          </button>
        }
      />

      {/* Account - last item */}
      {showAccount && (
        <button
          onClick={onToggleAccount}
          className="flex items-center justify-center rounded-lg p-2 transition-colors lg:flex-col lg:gap-1 lg:px-2 lg:py-1.5"
          title="Account"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user?.imageUrl} alt="Profile" />
            <AvatarFallback className="text-xs">{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-[10px] leading-none lg:block">Account</span>
        </button>
      )}
    </div>
  );
}

export default IconStrip;
