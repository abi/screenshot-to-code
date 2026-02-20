import { useEffect, useRef, useState } from "react";
import { generateCode } from "./generateCode";
import { AppState, EditorTheme, Settings } from "./types";
import { IS_RUNNING_ON_CLOUD } from "./config";
import { PicoBadge } from "./components/messages/PicoBadge";
import { OnboardingNote } from "./components/messages/OnboardingNote";
import { usePersistedState } from "./hooks/usePersistedState";
import TermsOfServiceDialog from "./components/TermsOfServiceDialog";
import { USER_CLOSE_WEB_SOCKET_CODE } from "./constants";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";
import { Stack } from "./lib/stacks";
import { CodeGenerationModel } from "./lib/models";
import useBrowserTabIndicator from "./hooks/useBrowserTabIndicator";
import { LuChevronLeft } from "react-icons/lu";
import {
  buildAssistantHistoryMessage,
  buildUserHistoryMessage,
  cloneVariantHistory,
  GenerationRequest,
  registerAssetIds,
  toRequestHistory,
} from "./lib/prompt-history";
// import TipLink from "./components/messages/TipLink";
import { useAppStore } from "./store/app-store";
import { useProjectStore } from "./store/project-store";
import { removeHighlight } from "./components/select-and-edit/utils";
import Sidebar from "./components/sidebar/Sidebar";
import IconStrip from "./components/sidebar/IconStrip";
import HistoryDisplay from "./components/history/HistoryDisplay";
import PreviewPane from "./components/preview/PreviewPane";
import StartPane from "./components/start-pane/StartPane";
import { Commit } from "./components/commits/types";
import { createCommit } from "./components/commits/utils";

function App() {
  const {
    // Inputs
    inputMode,
    setInputMode,
    referenceImages,
    setReferenceImages,
    initialPrompt,
    setInitialPrompt,
    upsertPromptAssets,
    resetPromptAssets,

    head,
    commits,
    addCommit,
    removeCommit,
    setHead,
    appendCommitCode,
    setCommitCode,
    resetCommits,
    resetHead,
    updateVariantStatus,
    resizeVariants,
    setVariantModels,
    appendVariantHistoryMessage,
    startAgentEvent,
    appendAgentEventContent,
    finishAgentEvent,

    // Outputs
    appendExecutionConsole,
    resetExecutionConsoles,
  } = useProjectStore();

  const {
    disableInSelectAndEditMode,
    setUpdateInstruction,
    updateImages,
    setUpdateImages,
    appState,
    setAppState,
    selectedElement,
    setSelectedElement,
  } = useAppStore();

  // Settings
  const [settings, setSettings] = usePersistedState<Settings>(
    {
      openAiApiKey: null,
      openAiBaseURL: null,
      anthropicApiKey: null,
      screenshotOneApiKey: null,
      isImageGenerationEnabled: true,
      editorTheme: EditorTheme.COBALT,
      generatedCodeConfig: Stack.HTML_TAILWIND,
      codeGenerationModel: CodeGenerationModel.CLAUDE_4_5_OPUS_2025_11_01,
      // Only relevant for hosted version
      isTermOfServiceAccepted: false,
    },
    "setting"
  );

  const wsRef = useRef<WebSocket>(null);
  const lastThinkingEventIdRef = useRef<Record<number, string>>({});
  const lastAssistantEventIdRef = useRef<Record<number, string>>({});
  const lastToolEventIdRef = useRef<Record<number, string>>({});

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"preview" | "chat">("preview");
  const showSelectAndEditFeature =
    settings.generatedCodeConfig === Stack.HTML_TAILWIND ||
    settings.generatedCodeConfig === Stack.HTML_CSS;

  // Indicate coding state using the browser tab's favicon and title
  useBrowserTabIndicator(appState === AppState.CODING);

  // When the user already has the settings in local storage, newly added keys
  // do not get added to the settings so if it's falsy, we populate it with the default
  // value
  useEffect(() => {
    if (!settings.generatedCodeConfig) {
      setSettings((prev) => ({
        ...prev,
        generatedCodeConfig: Stack.HTML_TAILWIND,
      }));
    }
  }, [settings.generatedCodeConfig, setSettings]);

  const getAssetsById = () => useProjectStore.getState().assetsById;

  // Functions
  const reset = () => {
    setAppState(AppState.INITIAL);
    setUpdateInstruction("");
    setUpdateImages([]);
    disableInSelectAndEditMode();
    resetExecutionConsoles();

    resetCommits();
    resetHead();
    resetPromptAssets();

    // Inputs
    setInputMode("image");
    setReferenceImages([]);
  };

  const regenerate = () => {
    if (head === null) {
      toast.error(
        "No current version set. Please contact support via chat or Github."
      );
      throw new Error("Regenerate called with no head");
    }

    // Retrieve the previous command
    const currentCommit = commits[head];
    if (currentCommit.type !== "ai_create") {
      toast.error("Only the first version can be regenerated.");
      return;
    }

    // Re-run the create
    if (inputMode === "image" || inputMode === "video") {
      doCreate(referenceImages, inputMode);
    } else {
      // TODO: Fix this
      doCreateFromText(initialPrompt);
    }
  };

  // Used when the user cancels the code generation
  const cancelCodeGeneration = () => {
    wsRef.current?.close?.(USER_CLOSE_WEB_SOCKET_CODE);
  };

  // Used for code generation failure as well
  const cancelCodeGenerationAndReset = (commit: Commit) => {
    // When the current commit is the first version, reset the entire app state
    if (commit.type === "ai_create") {
      reset();
    } else {
      // Otherwise, remove current commit from commits
      removeCommit(commit.hash);

      // Revert to parent commit
      const parentCommitHash = commit.parentHash;
      if (parentCommitHash) {
        setHead(parentCommitHash);
      } else {
        throw new Error("Parent commit not found");
      }

      setAppState(AppState.CODE_READY);
    }
  };

  function doGenerateCode(params: GenerationRequest) {
    // Reset the execution console
    resetExecutionConsoles();

    // Set the app state to coding during generation
    setAppState(AppState.CODING);

    const { variantHistory, ...requestParams } = params;

    // Merge settings with params
    const updatedParams = { ...requestParams, ...settings };

    // Create variants dynamically - start with 4 to handle most cases
    // Backend will use however many it needs (typically 3)
    const baseCommitObject = {
      variants: Array(4)
        .fill(null)
        .map(() => ({
          code: "",
          history: cloneVariantHistory(variantHistory),
        })),
    };

    const latestHistoryMessage =
      requestParams.history && requestParams.history.length > 0
        ? requestParams.history[requestParams.history.length - 1]
        : null;
    const latestUpdateInput = latestHistoryMessage ?? {
      text: requestParams.prompt.text,
      images: requestParams.prompt.images,
      videos: requestParams.prompt.videos ?? [],
    };

    const commitInputObject =
      requestParams.generationType === "create"
        ? {
            ...baseCommitObject,
            type: "ai_create" as const,
            parentHash: null,
            inputs: requestParams.prompt,
          }
        : {
            ...baseCommitObject,
            type: "ai_edit" as const,
            parentHash: head,
            inputs: {
              text: latestUpdateInput.text,
              images: latestUpdateInput.images,
              videos: latestUpdateInput.videos,
            },
          };

    // Create a new commit and set it as the head
    const commit = createCommit(commitInputObject);
    addCommit(commit);
    setHead(commit.hash);

    lastThinkingEventIdRef.current = {};
    lastAssistantEventIdRef.current = {};
    lastToolEventIdRef.current = {};

    const finishThinkingEvent = (variantIndex: number, status: "complete" | "error") => {
      const eventId = lastThinkingEventIdRef.current[variantIndex];
      if (!eventId) return;
      finishAgentEvent(commit.hash, variantIndex, eventId, {
        status,
        endedAt: Date.now(),
      });
      delete lastThinkingEventIdRef.current[variantIndex];
    };

    const finishAssistantEvent = (variantIndex: number, status: "complete" | "error") => {
      const eventId = lastAssistantEventIdRef.current[variantIndex];
      if (!eventId) return;
      finishAgentEvent(commit.hash, variantIndex, eventId, {
        status,
        endedAt: Date.now(),
      });
      delete lastAssistantEventIdRef.current[variantIndex];
    };

    const finishToolEvent = (variantIndex: number, status: "complete" | "error") => {
      const eventId = lastToolEventIdRef.current[variantIndex];
      if (!eventId) return;
      finishAgentEvent(commit.hash, variantIndex, eventId, {
        status,
        endedAt: Date.now(),
      });
      delete lastToolEventIdRef.current[variantIndex];
    };

    generateCode(wsRef, updatedParams, {
      onChange: (token, variantIndex) => {
        appendCommitCode(commit.hash, variantIndex, token);
      },
      onSetCode: (code, variantIndex) => {
        setCommitCode(commit.hash, variantIndex, code);
      },
      onStatusUpdate: (line, variantIndex) =>
        appendExecutionConsole(variantIndex, line),
      onVariantComplete: (variantIndex) => {
        console.log(`Variant ${variantIndex} complete event received`);
        updateVariantStatus(commit.hash, variantIndex, "complete");
        const currentCode =
          useProjectStore.getState().commits[commit.hash]?.variants[variantIndex]
            ?.code || "";
        if (currentCode.trim().length > 0) {
          appendVariantHistoryMessage(
            commit.hash,
            variantIndex,
            buildAssistantHistoryMessage(currentCode)
          );
        }
        finishThinkingEvent(variantIndex, "complete");
        finishAssistantEvent(variantIndex, "complete");
        finishToolEvent(variantIndex, "complete");
      },
      onVariantError: (variantIndex, error) => {
        console.error(`Error in variant ${variantIndex}:`, error);
        updateVariantStatus(commit.hash, variantIndex, "error", error);
        finishThinkingEvent(variantIndex, "error");
        finishAssistantEvent(variantIndex, "error");
        finishToolEvent(variantIndex, "error");
      },
      onVariantCount: (count) => {
        console.log(`Backend is using ${count} variants`);
        resizeVariants(commit.hash, count);
      },
      onVariantModels: (models) => {
        setVariantModels(commit.hash, models);
      },
      onThinking: (content, variantIndex, eventId) => {
        if (!eventId) return;
        lastThinkingEventIdRef.current[variantIndex] = eventId;
        startAgentEvent(commit.hash, variantIndex, {
          id: eventId,
          type: "thinking",
          status: "running",
          startedAt: Date.now(),
        });
        appendAgentEventContent(commit.hash, variantIndex, eventId, content);
      },
      onAssistant: (content, variantIndex, eventId) => {
        if (!eventId) return;
        lastAssistantEventIdRef.current[variantIndex] = eventId;
        startAgentEvent(commit.hash, variantIndex, {
          id: eventId,
          type: "assistant",
          status: "running",
          startedAt: Date.now(),
        });
        appendAgentEventContent(commit.hash, variantIndex, eventId, content);
      },
      onToolStart: (data, variantIndex, eventId) => {
        if (!eventId) return;
        const lastThinking = lastThinkingEventIdRef.current[variantIndex];
        if (lastThinking && lastThinking !== eventId) {
          finishThinkingEvent(variantIndex, "complete");
        }
        const lastAssistant = lastAssistantEventIdRef.current[variantIndex];
        if (lastAssistant && lastAssistant !== eventId) {
          finishAssistantEvent(variantIndex, "complete");
        }
        startAgentEvent(commit.hash, variantIndex, {
          id: eventId,
          type: "tool",
          status: "running",
          toolName: data?.name,
          input: data?.input,
          startedAt: Date.now(),
        });
        lastToolEventIdRef.current[variantIndex] = eventId;
      },
      onToolResult: (data, variantIndex, eventId) => {
        if (!eventId) return;
        finishAgentEvent(commit.hash, variantIndex, eventId, {
          status: data?.ok === false ? "error" : "complete",
          output: data?.output,
          endedAt: Date.now(),
        });
        if (lastToolEventIdRef.current[variantIndex] === eventId) {
          delete lastToolEventIdRef.current[variantIndex];
        }
      },
      onCancel: () => {
        cancelCodeGenerationAndReset(commit);
      },
      onComplete: () => {
        Object.keys(lastThinkingEventIdRef.current).forEach((key) => {
          finishThinkingEvent(Number(key), "complete");
        });
        Object.keys(lastAssistantEventIdRef.current).forEach((key) => {
          finishAssistantEvent(Number(key), "complete");
        });
        Object.keys(lastToolEventIdRef.current).forEach((key) => {
          finishToolEvent(Number(key), "complete");
        });
        setAppState(AppState.CODE_READY);
      },
    });
  }

  // Initial version creation
  function doCreate(
    referenceImages: string[],
    inputMode: "image" | "video",
    textPrompt: string = ""
  ) {
    // Reset any existing state
    reset();

    // Set the input states
    setReferenceImages(referenceImages);
    setInputMode(inputMode);

    // Kick off the code generation
    if (referenceImages.length > 0) {
      const media =
        inputMode === "video" ? [referenceImages[0]] : referenceImages;
      const imageAssetIds =
        inputMode === "image"
          ? registerAssetIds(
              "image",
              media,
              getAssetsById,
              upsertPromptAssets,
              nanoid
            )
          : [];
      const videoAssetIds =
        inputMode === "video"
          ? registerAssetIds(
              "video",
              media,
              getAssetsById,
              upsertPromptAssets,
              nanoid
            )
          : [];
      const variantHistory = [
        buildUserHistoryMessage(textPrompt, imageAssetIds, videoAssetIds),
      ];
      doGenerateCode({
        generationType: "create",
        inputMode,
        prompt: {
          text: textPrompt,
          images: inputMode === "image" ? media : [],
          videos: inputMode === "video" ? media : [],
        },
        variantHistory,
      });
    }
  }

  function doCreateFromText(text: string) {
    // Reset any existing state
    reset();

    setInputMode("text");
    setInitialPrompt(text);
    doGenerateCode({
      generationType: "create",
      inputMode: "text",
      prompt: { text, images: [], videos: [] },
      variantHistory: [buildUserHistoryMessage(text)],
    });
  }

  // Subsequent updates
  async function doUpdate(updateInstruction: string) {
    if (updateInstruction.trim() === "") {
      toast.error("Please include some instructions for AI on what to update.");
      return;
    }

    if (head === null) {
      toast.error(
        "No current version set. Contact support or open a Github issue."
      );
      throw new Error("Update called with no head");
    }

    const currentCommit = commits[head];
    const currentCode =
      currentCommit?.variants[currentCommit.selectedVariantIndex]?.code || "";
    const optionCodes = currentCommit?.variants.map(
      (variant) => variant.code || ""
    );

    let modifiedUpdateInstruction = updateInstruction;

    // Send in a reference to the selected element if it exists
    if (selectedElement) {
      const elementHtml = removeHighlight(selectedElement).outerHTML;
      modifiedUpdateInstruction =
        updateInstruction +
        " referring to this element specifically: " +
        elementHtml;
      setSelectedElement(null);
    }

    const selectedVariant = currentCommit.variants[currentCommit.selectedVariantIndex];
    const baseVariantHistory = selectedVariant.history;
    const updateImageAssetIds = registerAssetIds(
      "image",
      updateImages,
      getAssetsById,
      upsertPromptAssets,
      nanoid
    );
    const updatedVariantHistory = [
      ...cloneVariantHistory(baseVariantHistory),
      buildUserHistoryMessage(modifiedUpdateInstruction, updateImageAssetIds),
    ];
    const shouldBootstrapFromFileState =
      baseVariantHistory.length === 0 && currentCode.trim().length > 0;
    const updatedHistory = shouldBootstrapFromFileState
      ? []
      : toRequestHistory(updatedVariantHistory, getAssetsById);

    doGenerateCode({
      generationType: "update",
      inputMode,
      prompt: {
        text: modifiedUpdateInstruction,
        images: updateImages,
        videos: [],
      },
      history: updatedHistory,
      optionCodes,
      variantHistory: updatedVariantHistory,
      fileState: currentCode
        ? {
            path: "index.html",
            content: currentCode,
          }
        : undefined,
    });

    setUpdateInstruction("");
    setUpdateImages([]);
  }

  const handleTermDialogOpenChange = (open: boolean) => {
    setSettings((s) => ({
      ...s,
      isTermOfServiceAccepted: !open,
    }));
  };

  function setStack(stack: Stack) {
    setSettings((prev) => ({
      ...prev,
      generatedCodeConfig: stack,
    }));
  }

  function importFromCode(code: string, stack: Stack) {
    // Reset any existing state
    reset();

    // Set up this project
    setStack(stack);

    // Create a new commit and set it as the head
    const commit = createCommit({
      type: "code_create",
      parentHash: null,
      variants: [{ code, history: [] }],
      inputs: null,
    });
    addCommit(commit);
    setHead(commit.hash);

    // Set the app state
    setAppState(AppState.CODE_READY);
  }

  const showContentPanel =
    appState === AppState.CODING ||
    appState === AppState.CODE_READY ||
    isHistoryOpen;
  const isCodingOrReady =
    appState === AppState.CODING || appState === AppState.CODE_READY;
  const showMobileChatPane = showContentPanel && mobilePane === "chat";

  return (
    <div
      className={`dark:bg-black dark:text-white ${
        appState === AppState.CODING || appState === AppState.CODE_READY
          ? "flex h-dvh flex-col overflow-hidden lg:block lg:h-screen"
          : "min-h-screen"
      }`}
    >
      {IS_RUNNING_ON_CLOUD && <PicoBadge />}
      {IS_RUNNING_ON_CLOUD && (
        <TermsOfServiceDialog
          open={!settings.isTermOfServiceAccepted}
          onOpenChange={handleTermDialogOpenChange}
        />
      )}

      {/* Icon strip - always visible */}
      <div
        className="sticky top-0 z-50 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-16 lg:flex-col"
      >
        <IconStrip
          isHistoryOpen={isHistoryOpen}
          isEditorOpen={!isHistoryOpen}
          showHistory={isCodingOrReady}
          showEditor={isCodingOrReady}
          onToggleHistory={() => {
            setIsHistoryOpen((prev) => !prev);
            setMobilePane("chat");
          }}
          onToggleEditor={() => {
            setIsHistoryOpen(false);
            setMobilePane("preview");
          }}
          onLogoClick={() => {
            setIsHistoryOpen(false);
            setMobilePane("preview");
          }}
          onNewProject={() => {
            reset();
            setIsHistoryOpen(false);
            setMobilePane("preview");
          }}
          settings={settings}
          setSettings={setSettings}
        />
      </div>

      {isCodingOrReady && (
        <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
          <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-zinc-800">
            <button
              onClick={() => {
                setIsHistoryOpen(false);
                setMobilePane("preview");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mobilePane === "preview"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-gray-500 dark:text-zinc-400"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setMobilePane("chat")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mobilePane === "chat"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-gray-500 dark:text-zinc-400"
              }`}
            >
              Chat
            </button>
          </div>
        </div>
      )}

      {/* Content panel - shows sidebar, history, or editor */}
      {showContentPanel && (
        <div
          className={`border-b border-gray-200 bg-white dark:bg-zinc-950 dark:text-white lg:fixed lg:inset-y-0 lg:left-16 lg:z-40 lg:flex lg:w-[calc(28rem-4rem)] lg:flex-col lg:border-b-0 lg:border-r ${
            showMobileChatPane ? "block" : "hidden lg:flex"
          }`}
        >
            {isHistoryOpen ? (
              <div className="flex-1 overflow-y-auto sidebar-scrollbar-stable px-4">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Versions</h2>
                    <button
                      onClick={() => setIsHistoryOpen(false)}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <LuChevronLeft className="w-3.5 h-3.5" />
                      Back to editor
                    </button>
                  </div>
                  <HistoryDisplay />
                </div>
              </div>
            ) : (
              <>
                {IS_RUNNING_ON_CLOUD && !settings.openAiApiKey && (
                  <div className="px-6 mt-4">
                    <OnboardingNote />
                  </div>
                )}

                {(appState === AppState.CODING ||
                  appState === AppState.CODE_READY) && (
                  <Sidebar
                    showSelectAndEditFeature={showSelectAndEditFeature}
                    doUpdate={doUpdate}
                    regenerate={regenerate}
                    cancelCodeGeneration={cancelCodeGeneration}
                    onOpenVersions={() => {
                      setIsHistoryOpen(true);
                      setMobilePane("chat");
                    }}
                  />
                )}
              </>
            )}
        </div>
      )}

      <main
        className={`${
          showContentPanel
            ? "flex flex-1 min-h-0 flex-col lg:h-full lg:pl-[28rem]"
            : "lg:pl-16"
        } ${isCodingOrReady && mobilePane === "chat" ? "hidden lg:flex" : ""}`}
      >
        {appState === AppState.INITIAL && (
          <StartPane
            doCreate={doCreate}
            doCreateFromText={doCreateFromText}
            importFromCode={importFromCode}
            settings={settings}
            setSettings={setSettings}
          />
        )}

        {isCodingOrReady && (
          <PreviewPane
            settings={settings}
            onOpenVersions={() => {
              setIsHistoryOpen(true);
              setMobilePane("chat");
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
