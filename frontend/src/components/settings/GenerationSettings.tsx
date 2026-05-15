import React from "react";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState, DesignSystem, Settings } from "../../types";
import OutputSettingsSection from "./OutputSettingsSection";
import { Stack } from "../../lib/stacks";

interface GenerationSettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  designSystems?: DesignSystem[];
  onAddNewDesignSystem: () => void;
  onManageDesignSystems: () => void;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  settings,
  setSettings,
  designSystems = [],
  onAddNewDesignSystem,
  onManageDesignSystems,
}) => {
  const { appState } = useAppStore();
  const { inputMode } = useProjectStore();

  function setStack(stack: Stack) {
    setSettings((prev: Settings) => ({
      ...prev,
      generatedCodeConfig: stack,
    }));
  }

  function setSelectedDesignSystemId(id: string | null) {
    setSettings((prev: Settings) => ({
      ...prev,
      selectedDesignSystemId: id,
    }));
  }

  const shouldDisableUpdates =
    appState === AppState.CODING || appState === AppState.CODE_READY;

  // Hide stack selector for video mode (only HTML + Tailwind is supported)
  if (inputMode === "video") {
    return null;
  }

  return (
    <OutputSettingsSection
      stack={settings.generatedCodeConfig}
      setStack={setStack}
      shouldDisableUpdates={shouldDisableUpdates}
      designSystem={{
        designSystems,
        selectedDesignSystemId: settings.selectedDesignSystemId,
        setSelectedDesignSystemId,
        onAddNew: onAddNewDesignSystem,
        onManage: onManageDesignSystems,
      }}
    />
  );
};
