import React from "react";
import { Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import { Button } from "../ui/button";
import { useStore } from "../../store/store";
import UnifiedInputPane from "../unified-input/UnifiedInputPane";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
  ) => void;
  doCreateFromText: (text: string) => void;
  importFromCode: (code: string, stack: Stack) => void;
  settings: Settings;
}

const StartPane: React.FC<Props> = ({
  doCreate,
  doCreateFromText,
  importFromCode,
  settings,
}) => {
  const setProjectsHistoryDialogOpen = useStore(
    (state) => state.setProjectsHistoryDialogOpen,
  );

  return (
    <div className="flex flex-col justify-center items-center py-8">
      <UnifiedInputPane
        doCreate={doCreate}
        doCreateFromText={doCreateFromText}
        importFromCode={importFromCode}
        settings={settings}
      />

      <div className="flex justify-between gap-x-2">
        <Button
          variant="secondary"
          onClick={() => setProjectsHistoryDialogOpen(true)}
        >
          Import from Your History
        </Button>
      </div>
    </div>
  );
};

export default StartPane;
