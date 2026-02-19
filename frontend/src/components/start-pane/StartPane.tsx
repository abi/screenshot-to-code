import React from "react";
import { Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import UnifiedInputPane from "../unified-input/UnifiedInputPane";

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
        onOpenProjects={onOpenProjects}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
};

export default StartPane;
