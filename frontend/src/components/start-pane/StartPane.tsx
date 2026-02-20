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
}

const StartPane: React.FC<Props> = ({
  doCreate,
  doCreateFromText,
  importFromCode,
  onOpenProjects,
  settings,
  setSettings,
}) => {
  return (
    <div className="flex flex-col justify-center items-center py-8">
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
