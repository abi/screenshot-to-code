import React, { useState } from "react";
import ImageUpload from "../ImageUpload";
import { UrlInputSection } from "../UrlInputSection";
import ImportCodeSection from "../ImportCodeSection";
import { Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import { Button } from "../ui/button";
import { useStore } from "../../store/store";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string
  ) => void;
  importFromCode: (code: string, stack: Stack) => void;
  settings: Settings;
}

const StartPane: React.FC<Props> = ({ doCreate, importFromCode, settings }) => {
  const setProjectsHistoryDialogOpen = useStore(
    (state) => state.setProjectsHistoryDialogOpen
  );
  const [hasImageUpload, setHasImageUpload] = useState(false);

  return (
    <div className="flex flex-col justify-center items-center gap-y-10">
      <ImageUpload
        setReferenceImages={doCreate}
        onUploadStateChange={setHasImageUpload}
      />

      {!hasImageUpload && (
        <>
          <UrlInputSection
            doCreate={doCreate}
            screenshotOneApiKey={settings.screenshotOneApiKey}
          />
          <div className="flex justify-between gap-x-2">
            <ImportCodeSection importFromCode={importFromCode} />
            <Button
              variant="secondary"
              onClick={() => setProjectsHistoryDialogOpen(true)}
            >
              Import from Your History
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default StartPane;
