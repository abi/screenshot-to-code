import classNames from "classnames";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState } from "../../types";
import CodePreview from "../preview/CodePreview";
import KeyboardShortcutBadge from "../core/KeyboardShortcutBadge";
import SelectAndEditModeToggleButton from "../select-and-edit/SelectAndEditModeToggleButton";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useEffect, useRef, useState, useCallback } from "react";
import HistoryDisplay from "../history/HistoryDisplay";
import Variants from "../variants/Variants";
import UpdateImageUpload, { UpdateImagePreview } from "../UpdateImageUpload";

interface SidebarProps {
  showSelectAndEditFeature: boolean;
  doUpdate: (instruction: string) => void;
  regenerate: () => void;
  cancelCodeGeneration: () => void;
}

function Sidebar({
  showSelectAndEditFeature,
  doUpdate,
  regenerate,
  cancelCodeGeneration,
}: SidebarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { appState, updateInstruction, setUpdateInstruction, updateImages, setUpdateImages } = useAppStore();

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type === 'image/png' || file.type === 'image/jpeg'
    );

    if (files.length > 0) {
      try {
        const newImagePromises = files.map(file => fileToDataURL(file));
        const newImages = await Promise.all(newImagePromises);
        setUpdateImages([...updateImages, ...newImages]);
      } catch (error) {
        console.error('Error reading files:', error);
      }
    }
  }, [updateImages, setUpdateImages]);

  const { inputMode, referenceImages, head, commits } = useProjectStore();

  const viewedCode =
    head && commits[head]
      ? commits[head].variants[commits[head].selectedVariantIndex].code
      : "";

  const isSelectedVariantComplete =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].status ===
      "complete";

  const isSelectedVariantError =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].status ===
      "error";

  const selectedVariantErrorMessage =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].errorMessage;

  useEffect(() => {
    if (
      (appState === AppState.CODE_READY || isSelectedVariantComplete) &&
      textareaRef.current
    ) {
      textareaRef.current.focus();
    }
  }, [appState, isSelectedVariantComplete]);

  useEffect(() => {
    setIsErrorExpanded(false);
  }, [head, commits[head || ""]?.selectedVariantIndex]);

  return (
    <>
      <Variants />

      {/* Show code preview when coding and the selected variant is not complete */}
      {appState === AppState.CODING && !isSelectedVariantComplete && (
        <div className="flex flex-col gap-3">
          {/* Speed disclaimer for video mode */}
          {inputMode === "video" && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-amber-800 dark:text-amber-200 text-xs">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Code generation from videos can take 3-4 minutes. We do multiple passes to get the best result.
                </span>
              </div>
            </div>
          )}

          <CodePreview code={viewedCode} />

          <Button
            onClick={cancelCodeGeneration}
            variant="outline"
            className="w-full"
          >
            Cancel All Generations
          </Button>
        </div>
      )}

      {/* Show error message when selected option has an error */}
      {isSelectedVariantError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="text-red-800 dark:text-red-200 text-sm">
            <div className="font-medium mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Generation failed
            </div>
            {selectedVariantErrorMessage && (
              <div className="mb-3">
                <div className="text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs font-mono break-words">
                  {selectedVariantErrorMessage.length > 200 && !isErrorExpanded
                    ? `${selectedVariantErrorMessage.slice(0, 200)}...`
                    : selectedVariantErrorMessage}
                </div>
                {selectedVariantErrorMessage.length > 200 && (
                  <button
                    onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                    className="text-red-600 dark:text-red-400 text-xs underline underline-offset-2 mt-2 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                  >
                    {isErrorExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}
            <div className="text-red-600 dark:text-red-400 text-xs">
              Switch to another option above to continue.
            </div>
          </div>
        </div>
      )}

      {/* Show update UI when app state is ready OR the selected variant is complete (but not errored) */}
      {(appState === AppState.CODE_READY || isSelectedVariantComplete) &&
        !isSelectedVariantError && (
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragging(false);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="grid w-full gap-3 relative">
              <UpdateImagePreview
                updateImages={updateImages}
                setUpdateImages={setUpdateImages}
              />
              <Textarea
                ref={textareaRef}
                placeholder="Tell the AI what to change..."
                onChange={(e) => setUpdateInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    doUpdate(updateInstruction);
                  }
                }}
                value={updateInstruction}
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => doUpdate(updateInstruction)}
                  className="update-btn flex-1"
                >
                  Update <KeyboardShortcutBadge letter="enter" />
                </Button>
                <UpdateImageUpload
                  updateImages={updateImages}
                  setUpdateImages={setUpdateImages}
                />
              </div>

              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 bg-indigo-50/95 dark:bg-indigo-950/95 border-2 border-dashed border-indigo-400 dark:border-indigo-500 rounded-xl flex items-center justify-center pointer-events-none z-10 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">Drop images here</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
              <Button
                onClick={regenerate}
                variant="outline"
                size="sm"
                className="regenerate-btn"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </Button>
              {showSelectAndEditFeature && <SelectAndEditModeToggleButton />}
            </div>
          </div>
        )}

      {/* Reference image display */}
      <div className="flex gap-x-2 mt-4">
        {referenceImages.length > 0 && (
          <div className="flex flex-col w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reference
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent"></div>
            </div>
            <div
              className={classNames({
                "scanning relative": appState === AppState.CODING,
              })}
            >
              {inputMode === "image" && (
                <img
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
                  src={referenceImages[0]}
                  alt="Reference"
                />
              )}
              {inputMode === "video" && (
                <video
                  muted
                  autoPlay
                  loop
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
                  src={referenceImages[0]}
                />
              )}
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-xs text-center mt-2 font-medium">
              {inputMode === "video" ? "Original Video" : "Original Screenshot"}
            </div>
          </div>
        )}
      </div>

      <HistoryDisplay shouldDisableReverts={appState === AppState.CODING} />
    </>
  );
}

export default Sidebar;
