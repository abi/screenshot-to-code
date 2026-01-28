import React from "react";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState, Settings } from "../../types";
import OutputSettingsSection from "./OutputSettingsSection";
import VideoModelSettingsSection from "./VideoModelSettingsSection";
import { Stack } from "../../lib/stacks";
import { VideoModel } from "../../lib/models";

interface GenerationSettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  settings,
  setSettings,
}) => {
  const { appState } = useAppStore();
  const { inputMode } = useProjectStore();

  function setStack(stack: Stack) {
    setSettings((prev: Settings) => ({
      ...prev,
      generatedCodeConfig: stack,
    }));
  }

  function setVideoModel(videoModel: VideoModel) {
    setSettings((prev: Settings) => ({
      ...prev,
      videoModel,
    }));
  }

  const shouldDisableUpdates =
    appState === AppState.CODING || appState === AppState.CODE_READY;

  return (
    <div className="flex flex-col gap-y-2">
      <OutputSettingsSection
        stack={settings.generatedCodeConfig}
        setStack={setStack}
        shouldDisableUpdates={shouldDisableUpdates}
      />
      {inputMode === "video" && (
        <VideoModelSettingsSection
          videoModel={settings.videoModel}
          setVideoModel={setVideoModel}
          shouldDisableUpdates={shouldDisableUpdates}
        />
      )}
    </div>
  );
};
