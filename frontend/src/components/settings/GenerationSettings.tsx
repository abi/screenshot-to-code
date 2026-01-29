import React from "react";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState, Settings } from "../../types";
import OutputSettingsSection from "./OutputSettingsSection";
import { Stack } from "../../lib/stacks";

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

  const shouldDisableUpdates =
    appState === AppState.CODING || appState === AppState.CODE_READY;

  // Hide stack selector for video mode (only HTML + Tailwind is supported)
  if (inputMode === "video") {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <OutputSettingsSection
        stack={settings.generatedCodeConfig}
        setStack={setStack}
        shouldDisableUpdates={shouldDisableUpdates}
      />
    </div>
  );
};
