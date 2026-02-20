import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { AppState } from "../../types";
import { Button } from "../ui/button";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  LuMousePointerClick,
  LuRefreshCw,
  LuArrowUp,
  LuMinus,
  LuPlus,
  LuX,
} from "react-icons/lu";
import { toast } from "react-hot-toast";

import Variants from "../variants/Variants";
import UpdateImageUpload, { UpdateImagePreview } from "../UpdateImageUpload";
import AgentActivity from "../agent/AgentActivity";
import WorkingPulse from "../core/WorkingPulse";
import { Dialog, DialogPortal, DialogOverlay } from "../ui/dialog";
import { Commit } from "../commits/types";

interface SidebarProps {
  showSelectAndEditFeature: boolean;
  doUpdate: (instruction: string) => void;
  regenerate: () => void;
  cancelCodeGeneration: () => void;
  onOpenVersions: () => void;
}

const MAX_UPDATE_IMAGES = 5;
const MIN_LIGHTBOX_ZOOM = 0.5;
const MAX_LIGHTBOX_ZOOM = 6;

function summarizeLatestChange(commit: Commit | null): string | null {
  if (!commit) return null;
  if (commit.type === "code_create") return "Imported existing code.";

  const text = commit.inputs.text.trim();
  if (text.length > 0) return text;

  if (commit.type === "ai_create") {
    return "Create";
  }

  if (commit.inputs.images.length > 1) {
    return `Updated with ${commit.inputs.images.length} reference images.`;
  }
  if (commit.inputs.images.length === 1) {
    return "Updated with one reference image.";
  }
  return "Updated code.";
}

function Sidebar({
  showSelectAndEditFeature,
  doUpdate,
  regenerate,
  cancelCodeGeneration,
  onOpenVersions,
}: SidebarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const middlePaneRef = useRef<HTMLDivElement>(null);
  const lightboxViewportRef = useRef<HTMLDivElement>(null);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxNaturalSize, setLightboxNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [lightboxFitScale, setLightboxFitScale] = useState(1);

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

  const { head, commits, latestCommitHash, setHead } = useProjectStore();

  const currentCommit = head ? commits[head] : null;
  const latestChangeSummary = summarizeLatestChange(currentCommit);
  const latestChangeImages =
    currentCommit && currentCommit.type !== "code_create"
      ? currentCommit.inputs.images
      : [];
  const latestChangeVideos =
    currentCommit && currentCommit.type !== "code_create"
      ? currentCommit.inputs.videos ?? []
      : [];
  const selectedVariantIndex = currentCommit?.selectedVariantIndex ?? 0;
  const selectedVariant = currentCommit?.variants[selectedVariantIndex];
  const selectedVariantEvents = selectedVariant?.agentEvents ?? [];
  const showWorkingIndicator =
    appState === AppState.CODING &&
    selectedVariantEvents.length === 0 &&
    head === latestCommitHash;
  const requestStartMs =
    selectedVariant?.requestStartedAt ??
    (currentCommit?.dateCreated
      ? new Date(currentCommit.dateCreated).getTime()
      : undefined);
  const elapsedSeconds = requestStartMs
    ? Math.max(1, Math.round((nowMs - requestStartMs) / 1000))
    : undefined;

  const isFirstGeneration = currentCommit?.type === "ai_create";
  const isViewingOlderVersion = head !== null && head !== latestCommitHash;

  // Compute version number for the current head
  const currentVersionNumber = (() => {
    if (!head) return null;
    const sorted = Object.values(commits).sort(
      (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
    );
    const index = sorted.findIndex((c) => c.hash === head);
    return index !== -1 ? index + 1 : null;
  })();

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

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    setLightboxZoom(1);
    setLightboxNaturalSize(null);
    setLightboxFitScale(1);
  }, []);

  const openLightbox = useCallback((image: string) => {
    setLightboxImage(image);
    setLightboxZoom(1);
    setLightboxNaturalSize(null);
    setLightboxFitScale(1);
  }, []);

  const recomputeLightboxFitScale = useCallback(() => {
    if (!lightboxViewportRef.current || !lightboxNaturalSize) return;

    const viewportWidth = lightboxViewportRef.current.clientWidth;
    const viewportHeight = lightboxViewportRef.current.clientHeight;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const fitScale = Math.min(
      viewportWidth / lightboxNaturalSize.width,
      viewportHeight / lightboxNaturalSize.height,
      1
    );
    setLightboxFitScale(fitScale);
  }, [lightboxNaturalSize]);

  useEffect(() => {
    if (!lightboxImage) return;
    recomputeLightboxFitScale();

    const handleResize = () => recomputeLightboxFitScale();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [lightboxImage, recomputeLightboxFitScale]);

  useEffect(() => {
    recomputeLightboxFitScale();
  }, [recomputeLightboxFitScale]);

  const zoomInLightbox = () => {
    setLightboxZoom((current) =>
      Math.min(MAX_LIGHTBOX_ZOOM, Math.round((current + 0.25) * 100) / 100)
    );
  };

  const zoomOutLightbox = () => {
    setLightboxZoom((current) =>
      Math.max(MIN_LIGHTBOX_ZOOM, Math.round((current - 0.25) * 100) / 100)
    );
  };

  const resetLightboxZoom = () => {
    setLightboxZoom(1);
  };

  const effectiveLightboxScale = lightboxFitScale * lightboxZoom;
  const lightboxDisplayWidth = lightboxNaturalSize
    ? Math.max(1, Math.round(lightboxNaturalSize.width * effectiveLightboxScale))
    : undefined;
  const lightboxDisplayHeight = lightboxNaturalSize
    ? Math.max(1, Math.round(lightboxNaturalSize.height * effectiveLightboxScale))
    : undefined;


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
        {latestChangeSummary && (
          <div className="mb-4 flex flex-col items-end">
            <div className="inline-block max-w-[85%] rounded-2xl rounded-br-md bg-violet-100 px-4 py-2.5 dark:bg-violet-900/30">
              <p className="text-[15px] text-violet-950 dark:text-violet-100 break-words">
                {latestChangeSummary}
              </p>
            </div>
              {latestChangeImages.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap justify-end">
                  {latestChangeImages.map((image, index) => (
                    <button
                      key={`${image.slice(0, 40)}-${index}`}
                      onClick={() => openLightbox(image)}
                      className="shrink-0 cursor-zoom-in rounded-lg border border-gray-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-500 transition-colors"
                    >
                      <img
                        src={image}
                        alt={`Reference ${index + 1}`}
                        className="h-24 w-24 object-contain"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
              {latestChangeVideos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {latestChangeVideos.map((video, index) => (
                    <video
                      key={`${video.slice(0, 40)}-${index}`}
                      src={video}
                      className="w-full rounded-lg border border-gray-200 dark:border-zinc-700"
                      controls
                      preload="metadata"
                    />
                  ))}
                </div>
              )}
          </div>
        )}

        {showWorkingIndicator && (
          <div className="working-indicator-bg mb-3 rounded-xl border border-violet-200 dark:border-violet-800 px-3 py-2 transition-all duration-500">
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

        {isViewingOlderVersion && currentVersionNumber !== null ? (
          <div className="mb-4 flex flex-col items-center py-6">
            <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
              Version {currentVersionNumber}
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              You are viewing an older version
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onOpenVersions}
                className="rounded-lg border border-gray-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                All versions
              </button>
              <button
                onClick={() => latestCommitHash && setHead(latestCommitHash)}
                className="rounded-lg bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-colors"
              >
                View latest
              </button>
            </div>
          </div>
        ) : (
          <AgentActivity />
        )}

        {/* Regenerate button for first generation */}
        {isFirstGeneration && head === latestCommitHash && (appState === AppState.CODE_READY || isSelectedVariantComplete) && !isSelectedVariantError && (
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
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 mb-2">
            <div className="text-red-800 dark:text-red-200 text-sm">
              <div className="font-medium mb-1">
                This option failed to generate because
              </div>
              {selectedVariantErrorMessage && (
                <div className="mb-2">
                  <div className="text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded px-2 py-1 text-xs font-mono break-words">
                    {selectedVariantErrorMessage.length > 200 && !isErrorExpanded
                      ? `${selectedVariantErrorMessage.slice(0, 200)}...`
                      : selectedVariantErrorMessage}
                  </div>
                  {selectedVariantErrorMessage.length > 200 && (
                    <button
                      onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                      className="text-red-600 dark:text-red-400 text-xs underline mt-1 hover:text-red-800 dark:hover:text-red-300"
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
            className="shrink-0 border-t border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 px-4 py-4"
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
            <div className="relative w-full overflow-hidden rounded-2xl border-2 border-violet-300 bg-white transition-all focus-within:border-violet-500 dark:border-violet-500/50 dark:bg-zinc-900 dark:focus-within:border-violet-400">
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
                className="max-h-40 w-full resize-none border-0 bg-transparent px-4 pt-4 pb-6 text-[15px] leading-6 text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
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
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                  className={`rounded-xl p-2 transition-colors update-btn ${
                    updateInstruction.trim()
                      ? "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400"
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

      {/* Image lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogPortal>
          <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
          <div
            className="fixed inset-0 z-50 p-4 sm:p-6"
            onClick={closeLightbox}
          >
            <div className="relative flex h-full w-full flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="absolute right-0 top-0 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1.5 backdrop-blur-sm">
                <button
                  onClick={zoomOutLightbox}
                  className="rounded-md p-1.5 text-white hover:bg-white/10 disabled:opacity-40"
                  disabled={lightboxZoom <= MIN_LIGHTBOX_ZOOM}
                  title="Zoom out"
                >
                  <LuMinus className="h-4 w-4" />
                </button>
                <button
                  onClick={resetLightboxZoom}
                  className="rounded-md px-2 py-1 text-xs font-medium text-white hover:bg-white/10"
                  title="Reset zoom"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>
                <button
                  onClick={zoomInLightbox}
                  className="rounded-md p-1.5 text-white hover:bg-white/10 disabled:opacity-40"
                  disabled={lightboxZoom >= MAX_LIGHTBOX_ZOOM}
                  title="Zoom in"
                >
                  <LuPlus className="h-4 w-4" />
                </button>
                <button
                  onClick={closeLightbox}
                  className="rounded-md p-1.5 text-white hover:bg-white/10"
                  title="Close"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>
              <div
                ref={lightboxViewportRef}
                className="mt-12 flex-1 overflow-auto rounded-lg"
              >
                <div className="flex min-h-full min-w-full items-center justify-center p-4">
                  {lightboxImage && (
                    <img
                      src={lightboxImage}
                      alt="Reference image"
                      className="rounded-lg object-contain"
                      style={
                        lightboxDisplayWidth && lightboxDisplayHeight
                          ? {
                              width: `${lightboxDisplayWidth}px`,
                              height: `${lightboxDisplayHeight}px`,
                              maxWidth: "none",
                              maxHeight: "none",
                            }
                          : undefined
                      }
                      onLoad={(event) => {
                        setLightboxNaturalSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        });
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

export default Sidebar;
