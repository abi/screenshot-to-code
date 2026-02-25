import React from "react";
import { Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import { IS_RUNNING_ON_CLOUD } from "../../config";
import UnifiedInputPane from "../unified-input/UnifiedInputPane";
import RecentProjects from "./RecentProjects";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
  ) => void;
  doCreateFromText: (text: string) => void;
  importFromCode: (code: string, stack: Stack) => void;
  onOpenProjects: () => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  freeTrialInfo?: { used: number; limit: number };
}

const StartPane: React.FC<Props> = ({
  doCreate,
  doCreateFromText,
  importFromCode,
  onOpenProjects,
  settings,
  setSettings,
  freeTrialInfo,
}) => {
  return (
    <div className="flex flex-col justify-center items-center py-8">
      {freeTrialInfo && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          Free trial: {freeTrialInfo.limit - freeTrialInfo.used} of{" "}
          {freeTrialInfo.limit} generations remaining
        </div>
      )}
      <UnifiedInputPane
        doCreate={doCreate}
        doCreateFromText={doCreateFromText}
        importFromCode={importFromCode}
        settings={settings}
        setSettings={setSettings}
      />
      {IS_RUNNING_ON_CLOUD && (
        <RecentProjects
          importFromCode={importFromCode}
          onOpenProjects={onOpenProjects}
        />
      )}
    </div>
  );
};

export default StartPane;
