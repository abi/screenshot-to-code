import { useState } from "react";
import {
  LuChevronDown,
  LuImage,
  LuLayers,
  LuMessageSquarePlus,
} from "react-icons/lu";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import OutputSettingsSection from "../settings/OutputSettingsSection";
import { DesignSystemSelectorProps } from "../settings/DesignSystemSelector";
import { Stack } from "../../lib/stacks";

interface Props {
  textPrompt: string;
  onTextPromptChange: (value: string) => void;
  textInputRef: React.RefObject<HTMLTextAreaElement>;
  onTextInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  stack: Stack;
  setStack: (stack: Stack) => void;
  designSystem: DesignSystemSelectorProps;
  showAssetExtraction: boolean;
  isAssetExtractionEnabled: boolean;
  onAssetExtractionChange: (enabled: boolean) => void;
  onGenerate: () => void;
  actionLabel?: string;
  loadingActionLabel?: string;
  isActionLoading?: boolean;
  actionTestId?: string;
}

function AssetToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label
      htmlFor="asset-extraction-original"
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 sm:px-5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500">
        <LuImage className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">
        Extract image assets from original
      </span>
      <span className="ml-auto flex items-center">
        <Checkbox
          id="asset-extraction-original"
          checked={enabled}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      </span>
    </label>
  );
}

export default function ScreenshotToCodeControls({
  textPrompt,
  onTextPromptChange,
  textInputRef,
  onTextInputKeyDown,
  stack,
  setStack,
  designSystem,
  showAssetExtraction,
  isAssetExtractionEnabled,
  onAssetExtractionChange,
  onGenerate,
  actionLabel = "Generate Code",
  loadingActionLabel = "Generating…",
  isActionLoading = false,
  actionTestId = "upload-generate",
}: Props) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const hasInstructions = textPrompt.trim().length > 0;

  const toggleInstructions = () => {
    const shouldOpen = !instructionsOpen;
    setInstructionsOpen(shouldOpen);
    if (shouldOpen) {
      window.setTimeout(() => textInputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500">
            <LuLayers className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">
            Stack
          </span>
          <div className="ml-auto">
            <OutputSettingsSection
              stack={stack}
              setStack={setStack}
              designSystem={designSystem}
              inline
            />
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={toggleInstructions}
            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300 dark:hover:bg-zinc-800/50 dark:focus-visible:ring-zinc-600 sm:px-5"
            aria-expanded={instructionsOpen}
            aria-controls="additional-instructions"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-400 transition-colors group-hover:text-gray-600 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:text-zinc-300">
              <LuMessageSquarePlus className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {hasInstructions ? "Additional instructions" : "Add instructions"}
                </span>
                {!hasInstructions && (
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                    Optional
                  </span>
                )}
              </span>
              {hasInstructions && !instructionsOpen && (
                <span className="mt-0.5 block truncate text-xs text-gray-400 dark:text-zinc-500">
                  {textPrompt}
                </span>
              )}
            </span>
            <LuChevronDown
              className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-zinc-500 ${
                instructionsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {instructionsOpen && (
            <div id="additional-instructions" className="px-4 pb-4 sm:px-5">
              <textarea
                ref={textInputRef}
                value={textPrompt}
                onChange={(event) => onTextPromptChange(event.target.value)}
                onKeyDown={onTextInputKeyDown}
                placeholder="Describe anything you want changed or emphasized…"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                rows={2}
                aria-label="Instructions for generated code"
              />
            </div>
          )}
        </div>

        {showAssetExtraction && (
          <div className="border-t border-gray-100 dark:border-zinc-800">
            <AssetToggle
              enabled={isAssetExtractionEnabled}
              onChange={onAssetExtractionChange}
            />
          </div>
        )}

        <div className="flex justify-end border-t border-gray-100 bg-gray-50/70 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-800/50 sm:px-5">
          <div className="w-full sm:w-56">
            <Button
              onClick={onGenerate}
              disabled={isActionLoading}
              className="w-full"
              size="lg"
              data-testid={actionTestId}
            >
              {isActionLoading && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isActionLoading ? loadingActionLabel : actionLabel}
              {!isActionLoading && (
                <span className="ml-2 text-xs font-normal opacity-60">↵</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
