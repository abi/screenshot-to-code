import { useEffect, useRef } from "react";
import ImageUpload from "./components/ImageUpload";
import { generateCode } from "./generateCode";
import SettingsDialog from "./components/SettingsDialog";
import { AppState, CodeGenerationParams, EditorTheme, Settings } from "./types";
import { IS_RUNNING_ON_CLOUD } from "./config";
import { PicoBadge } from "./components/PicoBadge";
import { OnboardingNote } from "./components/OnboardingNote";
import { usePersistedState } from "./hooks/usePersistedState";
import { UrlInputSection } from "./components/UrlInputSection";
import TermsOfServiceDialog from "./components/TermsOfServiceDialog";
import html2canvas from "html2canvas";
import { USER_CLOSE_WEB_SOCKET_CODE } from "./constants";
import OutputSettingsSection from "./components/OutputSettingsSection";
import { History } from "./components/history/history_types";
import HistoryDisplay from "./components/history/HistoryDisplay";
import { extractHistoryTree } from "./components/history/utils";
import toast from "react-hot-toast";
import ImportCodeSection from "./components/ImportCodeSection";
import { Stack } from "./lib/stacks";
import { CodeGenerationModel } from "./lib/models";
import ModelSettingsSection from "./components/ModelSettingsSection";
import useBrowserTabIndicator from "./hooks/useBrowserTabIndicator";
import TipLink from "./components/core/TipLink";
import { useAppStore } from "./store/app-store";
import { useProjectStore } from "./store/project-store";
import Sidebar from "./components/sidebar/Sidebar";
import Preview from "./components/preview/Preview";

function App() {
  const {
    // Inputs
    inputMode,
    setInputMode,
    isImportedFromCode,
    setIsImportedFromCode,
    referenceImages,
    setReferenceImages,

    // Outputs
    setGeneratedCode,
    setExecutionConsole,
    currentVersion,
    setCurrentVersion,
    appHistory,
    setAppHistory,
  } = useProjectStore();

  const {
    disableInSelectAndEditMode,
    setUpdateInstruction,
    appState,
    setAppState,
    shouldIncludeResultImage,
    setShouldIncludeResultImage,
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
      codeGenerationModel: CodeGenerationModel.CLAUDE_3_5_SONNET_2024_06_20,
      // Only relevant for hosted version
      isTermOfServiceAccepted: false,
    },
    "setting"
  );

  // Code generation model from local storage or the default value
  const selectedCodeGenerationModel =
    settings.codeGenerationModel || CodeGenerationModel.GPT_4_VISION;

  const wsRef = useRef<WebSocket>(null);

  const showBetterModelMessage =
    selectedCodeGenerationModel !== CodeGenerationModel.GPT_4O_2024_05_13 &&
    selectedCodeGenerationModel !==
      CodeGenerationModel.CLAUDE_3_5_SONNET_2024_06_20 &&
    appState === AppState.INITIAL;

  const showSelectAndEditFeature =
    (selectedCodeGenerationModel === CodeGenerationModel.GPT_4O_2024_05_13 ||
      selectedCodeGenerationModel ===
        CodeGenerationModel.CLAUDE_3_5_SONNET_2024_06_20) &&
    (settings.generatedCodeConfig === Stack.HTML_TAILWIND ||
      settings.generatedCodeConfig === Stack.HTML_CSS);

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

  const takeScreenshot = async (): Promise<string> => {
    const iframeElement = document.querySelector(
      "#preview-desktop"
    ) as HTMLIFrameElement;
    if (!iframeElement?.contentWindow?.document.body) {
      return "";
    }

    const canvas = await html2canvas(iframeElement.contentWindow.document.body);
    const png = canvas.toDataURL("image/png");
    return png;
  };

  const reset = () => {
    setAppState(AppState.INITIAL);
    setGeneratedCode("");
    setReferenceImages([]);
    setExecutionConsole([]);
    setUpdateInstruction("");
    setIsImportedFromCode(false);
    setAppHistory([]);
    setCurrentVersion(null);
    setShouldIncludeResultImage(false);
    disableInSelectAndEditMode();
  };

  const regenerate = () => {
    if (currentVersion === null) {
      toast.error(
        "No current version set. Please open a Github issue as this shouldn't happen."
      );
      return;
    }

    // Retrieve the previous command
    const previousCommand = appHistory[currentVersion];
    if (previousCommand.type !== "ai_create") {
      toast.error("Only the first version can be regenerated.");
      return;
    }

    // Re-run the create
    doCreate(referenceImages, inputMode);
  };

  const cancelCodeGeneration = () => {
    wsRef.current?.close?.(USER_CLOSE_WEB_SOCKET_CODE);
    // make sure stop can correct the state even if the websocket is already closed
    cancelCodeGenerationAndReset();
  };

  const cancelCodeGenerationAndReset = () => {
    // When this is the first version, reset the entire app state
    if (currentVersion === null) {
      reset();
    } else {
      // Otherwise, revert to the last version
      setGeneratedCode(appHistory[currentVersion].code);
      setAppState(AppState.CODE_READY);
    }
  };

  function doGenerateCode(
    params: CodeGenerationParams,
    parentVersion: number | null
  ) {
    setExecutionConsole([]);
    setAppState(AppState.CODING);

    // Merge settings with params
    const updatedParams = { ...params, ...settings };

    generateCode(
      wsRef,
      updatedParams,
      // On change
      (token) => setGeneratedCode((prev) => prev + token),
      // On set code
      (code) => {
        setGeneratedCode(code);
        if (params.generationType === "create") {
          setAppHistory([
            {
              type: "ai_create",
              parentIndex: null,
              code,
              inputs: { image_url: referenceImages[0] },
            },
          ]);
          setCurrentVersion(0);
        } else {
          setAppHistory((prev) => {
            // Validate parent version
            if (parentVersion === null) {
              toast.error(
                "No parent version set. Contact support or open a Github issue."
              );
              return prev;
            }

            const newHistory: History = [
              ...prev,
              {
                type: "ai_edit",
                parentIndex: parentVersion,
                code,
                inputs: {
                  prompt: params.history
                    ? params.history[params.history.length - 1]
                    : "",
                },
              },
            ];
            setCurrentVersion(newHistory.length - 1);
            return newHistory;
          });
        }
      },
      // On status update
      (line) => setExecutionConsole((prev) => [...prev, line]),
      // On cancel
      () => {
        cancelCodeGenerationAndReset();
      },
      // On complete
      () => {
        setAppState(AppState.CODE_READY);
      }
    );
  }

  // Initial version creation
  function doCreate(referenceImages: string[], inputMode: "image" | "video") {
    // Reset any existing state
    reset();

    setReferenceImages(referenceImages);
    setInputMode(inputMode);
    if (referenceImages.length > 0) {
      doGenerateCode(
        {
          generationType: "create",
          image: referenceImages[0],
          inputMode,
        },
        currentVersion
      );
    }
  }

  // Subsequent updates
  async function doUpdate(
    updateInstruction: string,
    selectedElement?: HTMLElement
  ) {
    if (updateInstruction.trim() === "") {
      toast.error("Please include some instructions for AI on what to update.");
      return;
    }

    if (currentVersion === null) {
      toast.error(
        "No current version set. Contact support or open a Github issue."
      );
      return;
    }

    let historyTree;
    try {
      historyTree = extractHistoryTree(appHistory, currentVersion);
    } catch {
      toast.error(
        "Version history is invalid. This shouldn't happen. Please contact support or open a Github issue."
      );
      return;
    }

    let modifiedUpdateInstruction = updateInstruction;

    // Send in a reference to the selected element if it exists
    if (selectedElement) {
      modifiedUpdateInstruction =
        updateInstruction +
        " referring to this element specifically: " +
        selectedElement.outerHTML;
    }

    const updatedHistory = [...historyTree, modifiedUpdateInstruction];

    if (shouldIncludeResultImage) {
      const resultImage = await takeScreenshot();
      doGenerateCode(
        {
          generationType: "update",
          inputMode,
          image: referenceImages[0],
          resultImage: resultImage,
          history: updatedHistory,
          isImportedFromCode,
        },
        currentVersion
      );
    } else {
      doGenerateCode(
        {
          generationType: "update",
          inputMode,
          image: referenceImages[0],
          history: updatedHistory,
          isImportedFromCode,
        },
        currentVersion
      );
    }

    setGeneratedCode("");
    setUpdateInstruction("");
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

  function setCodeGenerationModel(codeGenerationModel: CodeGenerationModel) {
    setSettings((prev) => ({
      ...prev,
      codeGenerationModel,
    }));
  }

  function importFromCode(code: string, stack: Stack) {
    setIsImportedFromCode(true);

    // Set up this project
    setGeneratedCode(code);
    setStack(stack);
    setAppHistory([
      {
        type: "code_create",
        parentIndex: null,
        code,
        inputs: { code },
      },
    ]);
    setCurrentVersion(0);

    setAppState(AppState.CODE_READY);
  }

  return (
    <div className="mt-2 dark:bg-black dark:text-white">
      {IS_RUNNING_ON_CLOUD && <PicoBadge />}
      {IS_RUNNING_ON_CLOUD && (
        <TermsOfServiceDialog
          open={!settings.isTermOfServiceAccepted}
          onOpenChange={handleTermDialogOpenChange}
        />
      )}
      <div className="lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-96 lg:flex-col">
        <div className="flex grow flex-col gap-y-2 overflow-y-auto border-r border-gray-200 bg-white px-6 dark:bg-zinc-950 dark:text-white">
          <div className="flex items-center justify-between mt-10 mb-2">
            <h1 className="text-2xl ">Screenshot to Code</h1>
            <SettingsDialog settings={settings} setSettings={setSettings} />
          </div>

          <OutputSettingsSection
            stack={settings.generatedCodeConfig}
            setStack={(config) => setStack(config)}
            shouldDisableUpdates={
              appState === AppState.CODING || appState === AppState.CODE_READY
            }
          />

          <ModelSettingsSection
            codeGenerationModel={selectedCodeGenerationModel}
            setCodeGenerationModel={setCodeGenerationModel}
            shouldDisableUpdates={
              appState === AppState.CODING || appState === AppState.CODE_READY
            }
          />

          {showBetterModelMessage && (
            <div className="rounded-lg p-2 bg-fuchsia-200">
              <p className="text-gray-800 text-sm">
                We no longer support this model. Instead, code generation will
                use GPT-4o or Claude Sonnet 3.5, the 2 state-of-the-art models.
              </p>
            </div>
          )}

          {appState !== AppState.CODE_READY && <TipLink />}

          {IS_RUNNING_ON_CLOUD && !settings.openAiApiKey && <OnboardingNote />}

          {(appState === AppState.CODING ||
            appState === AppState.CODE_READY) && (
            <Sidebar
              showSelectAndEditFeature={showSelectAndEditFeature}
              doUpdate={doUpdate}
              regenerate={regenerate}
              cancelCodeGeneration={cancelCodeGeneration}
            />
          )}
          {
            <HistoryDisplay
              shouldDisableReverts={appState === AppState.CODING}
            />
          }
        </div>
      </div>

      <main className="py-2 lg:pl-96">
        {appState === AppState.INITIAL && (
          <div className="flex flex-col justify-center items-center gap-y-10">
            <ImageUpload setReferenceImages={doCreate} />
            <UrlInputSection
              doCreate={doCreate}
              screenshotOneApiKey={settings.screenshotOneApiKey}
            />
            <ImportCodeSection importFromCode={importFromCode} />
          </div>
        )}

        {(appState === AppState.CODING || appState === AppState.CODE_READY) && (
          <Preview doUpdate={doUpdate} reset={reset} settings={settings} />
        )}
      </main>
    </div>
  );
}

export default App;
