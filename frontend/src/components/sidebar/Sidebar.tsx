import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState } from "../../types";
import { Button } from "../ui/button";
import { useEffect, useRef, useState, useCallback } from "react";
import { LuMousePointerClick, LuRefreshCw, LuArrowUp } from "react-icons/lu";
import { toast } from "react-hot-toast";

import Variants from "../variants/Variants";
import UpdateImageUpload, { UpdateImagePreview } from "../UpdateImageUpload";
import AgentActivity from "../agent/AgentActivity";
import WorkingPulse from "../core/WorkingPulse";

interface SidebarProps {
  showSelectAndEditFeature: boolean;
  doUpdate: (instruction: string) => void;
  regenerate: () => void;
  cancelCodeGeneration: () => void;
}

const MAX_UPDATE_IMAGES = 5;

function Sidebar({
  showSelectAndEditFeature,
  doUpdate,
  regenerate,
  cancelCodeGeneration,
}: SidebarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const middlePaneRef = useRef<HTMLDivElement>(null);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { appState, updateInstruction, setUpdateInstruction, updateImages, setUpdateImages, inSelectAndEditMode, toggleInSelectAndEditMode } = useAppStore();

  // Helper function to convert file to data URL
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === "image/png" || file.type === "image/jpeg"
      );

      if (files.length === 0) return;

      try {
        if (updateImages.length >= MAX_UPDATE_IMAGES) {
          toast.error(
            `You’ve reached the limit of ${MAX_UPDATE_IMAGES} reference images. Remove one to add another.`
          );
          return;
        }

        const remainingSlots = MAX_UPDATE_IMAGES - updateImages.length;
        let filesToAdd = files;
        if (filesToAdd.length > remainingSlots) {
          toast.error(
            `Only ${remainingSlots} more image${
              remainingSlots === 1 ? "" : "s"
            } will be added to stay within the ${MAX_UPDATE_IMAGES}-image limit.`
          );
          filesToAdd = filesToAdd.slice(0, remainingSlots);
        }

        const newImagePromises = filesToAdd.map((file) => fileToDataURL(file));
        const newImages = await Promise.all(newImagePromises);
        setUpdateImages([...updateImages, ...newImages]);
      } catch (error) {
        console.error("Error reading files:", error);
      }
    },
    [updateImages, setUpdateImages]
  );

  const { head, commits } = useProjectStore();

  const currentCommit = head ? commits[head] : null;
  const selectedVariantIndex = currentCommit?.selectedVariantIndex ?? 0;
  const selectedVariant = currentCommit?.variants[selectedVariantIndex];
  const selectedVariantEvents = selectedVariant?.agentEvents ?? [];
  const showWorkingIndicator =
    appState === AppState.CODING && selectedVariantEvents.length === 0;
  const requestStartMs =
    selectedVariant?.requestStartedAt ??
    (currentCommit?.dateCreated
      ? new Date(currentCommit.dateCreated).getTime()
      : undefined);
  const elapsedSeconds = requestStartMs
    ? Math.max(1, Math.round((nowMs - requestStartMs) / 1000))
    : undefined;

  const isFirstGeneration = currentCommit?.type === "ai_create";

  // Check if the currently selected variant is complete
  const isSelectedVariantComplete =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].status ===
      "complete";

  // Check if the currently selected variant has an error
  const isSelectedVariantError =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].status ===
      "error";

  // Get the error message from the selected variant
  const selectedVariantErrorMessage =
    head &&
    commits[head] &&
    commits[head].variants[commits[head].selectedVariantIndex].errorMessage;

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, []);

  // Focus on the update instruction textarea when a variant is complete
  useEffect(() => {
    if (
      (appState === AppState.CODE_READY || isSelectedVariantComplete) &&
      textareaRef.current
    ) {
      textareaRef.current.focus();
    }
  }, [appState, isSelectedVariantComplete]);

  // Reset textarea height when instruction changes externally (e.g., cleared after submit)
  useEffect(() => {
    autoResize();
  }, [updateInstruction, autoResize]);

  // Reset error expanded state when variant changes
  useEffect(() => {
    setIsErrorExpanded(false);
  }, [head, commits[head || ""]?.selectedVariantIndex]);

  useEffect(() => {
    if (!middlePaneRef.current) return;
    requestAnimationFrame(() => {
      if (!middlePaneRef.current) return;
      middlePaneRef.current.scrollTop = middlePaneRef.current.scrollHeight;
    });
  }, [head, selectedVariantIndex]);

  useEffect(() => {
    if (appState !== AppState.CODING) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [appState]);


  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2">
        <Variants />
      </div>

      {/* Scrollable content */}
      <div
        ref={middlePaneRef}
        className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar-stable px-6 pt-4"
      >
        {showWorkingIndicator && (
          <div className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <WorkingPulse />
                <span>Working...</span>
              </div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                Time so far {elapsedSeconds ? `${elapsedSeconds}s` : "--"}
              </div>
            </div>
          </div>
        )}

        <AgentActivity />

        {/* Regenerate button for first generation */}
        {isFirstGeneration && (appState === AppState.CODE_READY || isSelectedVariantComplete) && !isSelectedVariantError && (
          <div className="flex justify-end mb-3">
            <button
              onClick={regenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LuRefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Show cancel button when coding */}
        {appState === AppState.CODING && !isSelectedVariantComplete && (
          <div className="flex w-full">
            <Button
              onClick={cancelCodeGeneration}
              className="w-full dark:text-white dark:bg-gray-700"
            >
              Cancel All Generations
            </Button>
          </div>
        )}

        {/* Show error message when selected option has an error */}
        {isSelectedVariantError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
            <div className="text-red-800 text-sm">
              <div className="font-medium mb-1">
                This option failed to generate because
              </div>
              {selectedVariantErrorMessage && (
                <div className="mb-2">
                  <div className="text-red-700 bg-red-100 border border-red-300 rounded px-2 py-1 text-xs font-mono break-words">
                    {selectedVariantErrorMessage.length > 200 && !isErrorExpanded
                      ? `${selectedVariantErrorMessage.slice(0, 200)}...`
                      : selectedVariantErrorMessage}
                  </div>
                  {selectedVariantErrorMessage.length > 200 && (
                    <button
                      onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                      className="text-red-600 text-xs underline mt-1 hover:text-red-800"
                    >
                      {isErrorExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}
              <div>Switch to another option above to make updates.</div>
            </div>
          </div>
        )}
      </div>

      {/* Pinned bottom: prompt box + option selector */}
      {(appState === AppState.CODE_READY || isSelectedVariantComplete) &&
        !isSelectedVariantError && (
          <div
            className="shrink-0 bg-white dark:bg-zinc-950 px-4 py-2"
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragging(false);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Select and edit instructions card */}
            {inSelectAndEditMode && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-2">
                <div className="flex items-center gap-2">
                  <LuMousePointerClick className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Click any element in the preview to edit it</span>
                </div>
                <button
                  onClick={toggleInSelectAndEditMode}
                  className="shrink-0 ml-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Exit
                </button>
              </div>
            )}
            <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/5">
              <UpdateImagePreview
                updateImages={updateImages}
                setUpdateImages={setUpdateImages}
              />
              <textarea
                ref={textareaRef}
                placeholder="Tell the AI what to change..."
                onChange={(e) => {
                  setUpdateInstruction(e.target.value);
                  autoResize();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    doUpdate(updateInstruction);
                  }
                }}
                value={updateInstruction}
                data-testid="update-input"
                rows={1}
                className="max-h-40 w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3 text-[15px] leading-6 text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <UpdateImageUpload
                    updateImages={updateImages}
                    setUpdateImages={setUpdateImages}
                  />
                  {showSelectAndEditFeature && (
                    <button
                      onClick={toggleInSelectAndEditMode}
                      className={`rounded-lg p-2 transition-colors ${
                        inSelectAndEditMode
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                      }`}
                      title={inSelectAndEditMode ? "Exit selection mode" : "Select an element in the preview to target your edit"}
                    >
                      <LuMousePointerClick className="w-[18px] h-[18px]" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => doUpdate(updateInstruction)}
                  disabled={!updateInstruction.trim()}
                  className={`rounded-xl p-2.5 transition-colors update-btn ${
                    updateInstruction.trim()
                      ? "bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200"
                      : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-zinc-700 dark:text-zinc-500"
                  }`}
                  title="Send"
                >
                  <LuArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </button>
              </div>

              {isDragging && (
                <div className="absolute inset-0 bg-blue-50/90 dark:bg-gray-800/90 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-xl flex items-center justify-center pointer-events-none z-10">
                  <p className="text-blue-600 dark:text-blue-400 font-medium">Drop images here</p>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

export default Sidebar;
