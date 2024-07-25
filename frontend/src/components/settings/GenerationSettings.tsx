import React from "react";
import { useAppStore } from "../../store/app-store";
import { AppState, Settings } from "../../types";
import OutputSettingsSection from "./OutputSettingsSection";
import ModelSettingsSection from "./ModelSettingsSection";
import { Stack } from "../../lib/stacks";
import { CodeGenerationModel } from "../../lib/models";

interface GenerationSettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  selectedCodeGenerationModel: CodeGenerationModel;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  settings,
  setSettings,
  selectedCodeGenerationModel,
}) => {
  const { appState } = useAppStore();

  function setStack(stack: Stack) {
    setSettings((prev: Settings) => ({
      ...prev,
      generatedCodeConfig: stack,
    }));
  }

  function setCodeGenerationModel(codeGenerationModel: CodeGenerationModel) {
    setSettings((prev: Settings) => ({
      ...prev,
      codeGenerationModel,
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

      <ModelSettingsSection
        codeGenerationModel={selectedCodeGenerationModel}
        setCodeGenerationModel={setCodeGenerationModel}
        shouldDisableUpdates={shouldDisableUpdates}
      />
    </div>
  );
};
