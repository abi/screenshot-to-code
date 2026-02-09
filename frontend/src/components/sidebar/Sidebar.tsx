import classNames from "classnames";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState } from "../../types";
import CodePreview from "../preview/CodePreview";
// import TipLink from "../messages/TipLink";
import { Button } from "../ui/button";
import { useEffect, useRef, useState, useCallback } from "react";
import { LuMousePointerClick, LuRefreshCw, LuArrowUp } from "react-icons/lu";

import Variants from "../variants/Variants";
import UpdateImageUpload, { UpdateImagePreview } from "../UpdateImageUpload";
import AgentActivity from "../agent/AgentActivity";

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
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);

  const viewedCode =
    head && commits[head]
      ? commits[head].variants[commits[head].selectedVariantIndex].code
      : "";

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

  // Focus on the update instruction textarea when a variant is complete
  useEffect(() => {
    if (
      (appState === AppState.CODE_READY || isSelectedVariantComplete) &&
      textareaRef.current
    ) {
      textareaRef.current.focus();
    }
  }, [appState, isSelectedVariantComplete]);

  // Reset error expanded state when variant changes
  useEffect(() => {
    setIsErrorExpanded(false);
  }, [head, commits[head || ""]?.selectedVariantIndex]);

  useEffect(() => {
    if (activeReferenceIndex >= referenceImages.length) {
      setActiveReferenceIndex(0);
    }
  }, [activeReferenceIndex, referenceImages.length]);

  useEffect(() => {
    if (referenceImages.length > 0) {
      setActiveReferenceIndex(0);
    }
  }, [referenceImages]);

  return (
    <>
      <Variants />

      <AgentActivity />

      {/* Show code preview when coding and the selected variant is not complete */}
      {appState === AppState.CODING && !isSelectedVariantComplete && (
        <div className="flex flex-col">
          <CodePreview code={viewedCode} />

          <div className="flex w-full">
            <Button
              onClick={cancelCodeGeneration}
              className="w-full dark:text-white dark:bg-gray-700"
            >
              Cancel All Generations
            </Button>
          </div>
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
            <div className="relative w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
              <UpdateImagePreview
                updateImages={updateImages}
                setUpdateImages={setUpdateImages}
              />
              <textarea
                ref={textareaRef}
                placeholder="Tell the AI what to change..."
                onChange={(e) => setUpdateInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    doUpdate(updateInstruction);
                  }
                }}
                value={updateInstruction}
                data-testid="update-input"
                rows={3}
                className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-1">
                  <UpdateImageUpload
                    updateImages={updateImages}
                    setUpdateImages={setUpdateImages}
                  />
                  {showSelectAndEditFeature && (
                    <button
                      onClick={toggleInSelectAndEditMode}
                      className={`p-2 rounded-lg transition-colors ${
                        inSelectAndEditMode
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                      title={inSelectAndEditMode ? "Exit selection mode" : "Select and update"}
                    >
                      <LuMousePointerClick className="w-[18px] h-[18px]" />
                    </button>
                  )}
                  <button
                    onClick={regenerate}
                    className="p-2 rounded-lg transition-colors text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    title="Regenerate"
                  >
                    <LuRefreshCw className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <button
                  onClick={() => doUpdate(updateInstruction)}
                  className="p-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors update-btn"
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

      {/* Reference image display */}
      <div className="flex gap-x-2 mt-2">
        {referenceImages.length > 0 && (
          <div className="flex flex-col">
            <div
              className={classNames("relative w-[340px]", {
                scanning: appState === AppState.CODING,
              })}
            >
              {inputMode === "image" && (
                <div className="w-[340px] rounded-md border border-gray-200 bg-white p-2">
                  <div className="rounded-md border border-gray-100 bg-gray-50 p-1">
                    <img
                      className="w-full max-h-[360px] object-contain rounded"
                      src={referenceImages[activeReferenceIndex] || referenceImages[0]}
                      alt={`Reference ${activeReferenceIndex + 1}`}
                    />
                  </div>
                  {referenceImages.length > 1 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {referenceImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveReferenceIndex(index)}
                          className={`h-14 w-14 rounded border overflow-hidden flex-shrink-0 ${
                            activeReferenceIndex === index
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-200"
                          }`}
                          aria-label={`View reference ${index + 1}`}
                        >
                          <img
                            className="h-full w-full object-cover"
                            src={image}
                            alt={`Reference thumbnail ${index + 1}`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {inputMode === "video" && (
                <video
                  muted
                  autoPlay
                  loop
                  className="w-[340px] border border-gray-200 rounded-md"
                  src={referenceImages[0]}
                />
              )}
            </div>
            <div className="text-gray-400 uppercase text-sm text-center mt-1">
              {inputMode === "video"
                ? "Original Video"
                : referenceImages.length > 1
                  ? `Original Screenshots (${activeReferenceIndex + 1}/${referenceImages.length})`
                  : "Original Screenshot"}
            </div>
          </div>
        )}
      </div>

    </>
  );
}

export default Sidebar;
