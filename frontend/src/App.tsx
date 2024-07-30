import { useEffect, useRef, useState } from "react";
import { generateCode } from "./generateCode";
import { IS_FREE_TRIAL_ENABLED, IS_RUNNING_ON_CLOUD } from "./config";
import SettingsDialog from "./components/settings/SettingsDialog";
import { AppState, CodeGenerationParams, EditorTheme, Settings } from "./types";
import { PicoBadge } from "./components/messages/PicoBadge";
import { OnboardingNote } from "./components/messages/OnboardingNote";
import { usePersistedState } from "./hooks/usePersistedState";
import TermsOfServiceDialog from "./components/TermsOfServiceDialog";
import { USER_CLOSE_WEB_SOCKET_CODE } from "./constants";
import { addEvent } from "./lib/analytics";
import { History } from "./components/history/history_types";
import { extractHistoryTree } from "./components/history/utils";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";
import { useStore } from "./store/store";
import { Stack } from "./lib/stacks";
import { CodeGenerationModel } from "./lib/models";
import useBrowserTabIndicator from "./hooks/useBrowserTabIndicator";
import TipLink from "./components/messages/TipLink";
import { useAppStore } from "./store/app-store";
import GenerateFromText from "./components/generate-from-text/GenerateFromText";
import { useProjectStore } from "./store/project-store";
import PreviewPane from "./components/preview/PreviewPane";
import DeprecationMessage from "./components/messages/DeprecationMessage";
import { GenerationSettings } from "./components/settings/GenerationSettings";
import StartPane from "./components/start-pane/StartPane";
import { takeScreenshot } from "./lib/takeScreenshot";
import Sidebar from "./components/sidebar/Sidebar";

interface Props {
  navbarComponent?: JSX.Element;
}

function App({ navbarComponent }: Props) {
  const [initialPrompt, setInitialPrompt] = useState<string>("");

  // Relevant for hosted version only
  // TODO: Move to AppContainer
  const { getToken } = useAuth();
  const subscriberTier = useStore((state) => state.subscriberTier);

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

  const wsRef = useRef<WebSocket>(null);

  // Code generation model from local storage or the default value
  const model =
    settings.codeGenerationModel || CodeGenerationModel.GPT_4_VISION;

  const showBetterModelMessage =
    model !== CodeGenerationModel.GPT_4O_2024_05_13 &&
    model !== CodeGenerationModel.CLAUDE_3_5_SONNET_2024_06_20 &&
    appState === AppState.INITIAL;

  const showSelectAndEditFeature =
    (model === CodeGenerationModel.GPT_4O_2024_05_13 ||
      model === CodeGenerationModel.CLAUDE_3_5_SONNET_2024_06_20) &&
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

  // Functions
  const reset = () => {
    setAppState(AppState.INITIAL);
    setGeneratedCode("");
    setReferenceImages([]);
    setInitialPrompt("");
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
      // This would be a error that I log to Sentry
      addEvent("RegenerateCurrentVersionNull");
      toast.error(
        "No current version set. Please open a Github issue as this shouldn't happen."
      );
      return;
    }

    // Retrieve the previous command
    const previousCommand = appHistory[currentVersion];
    if (previousCommand.type !== "ai_create") {
      addEvent("RegenerateNotFirstVersion");
      toast.error("Only the first version can be regenerated.");
      return;
    }

    addEvent("Regenerate");

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
    addEvent("Cancel");

    wsRef.current?.close?.(USER_CLOSE_WEB_SOCKET_CODE);
    // make sure stop can correct the state even if the websocket is already closed
    cancelCodeGenerationAndReset();
  };

  // Used for code generation failure as well
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

  async function doGenerateCode(
    params: CodeGenerationParams,
    parentVersion: number | null
  ) {
    // Reset the execution console
    setExecutionConsole([]);

    // Set the app state
    setAppState(AppState.CODING);

    // Merge settings with params
    const authToken = await getToken();
    const updatedParams = {
      ...params,
      ...settings,
      authToken: authToken || undefined,
    };

    generateCode(
      wsRef,
      updatedParams,
      // On change
      (token) => setGeneratedCode((prev) => prev + token),
      // On set code
      (code) => {
        setGeneratedCode(code);
        if (params.generationType === "create") {
          if (inputMode === "image" || inputMode === "video") {
            setAppHistory([
              {
                type: "ai_create",
                parentIndex: null,
                code,
                inputs: { image_url: referenceImages[0] },
              },
            ]);
          } else {
            setAppHistory([
              {
                type: "ai_create",
                parentIndex: null,
                code,
                inputs: { text: params.image },
              },
            ]);
          }
          setCurrentVersion(0);
        } else {
          setAppHistory((prev) => {
            // Validate parent version
            if (parentVersion === null) {
              toast.error(
                "No parent version set. Contact support or open a Github issue."
              );
              addEvent("ParentVersionNull");
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
                    : "", // History should never be empty when performing an edit
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
  async function doCreate(
    referenceImages: string[],
    inputMode: "image" | "video"
  ) {
    // Reset any existing state
    reset();

    // Set the input states
    setReferenceImages(referenceImages);
    setInputMode(inputMode);

    // Kick off the code generation
    if (referenceImages.length > 0) {
      addEvent("Create");
      await doGenerateCode(
        {
          generationType: "create",
          image: referenceImages[0],
          inputMode,
        },
        currentVersion
      );
    }
  }

  function doCreateFromText(text: string) {
    // Reset any existing state
    reset();

    setInputMode("text");
    setInitialPrompt(text);
    doGenerateCode(
      {
        generationType: "create",
        inputMode: "text",
        image: text,
      },
      currentVersion
    );
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
      addEvent("CurrentVersionNull");
      return;
    }

    let historyTree;
    try {
      historyTree = extractHistoryTree(appHistory, currentVersion);
    } catch {
      addEvent("HistoryTreeFailed");
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
      await doGenerateCode(
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
      await doGenerateCode(
        {
          generationType: "update",
          inputMode,
          image: inputMode === "text" ? initialPrompt : referenceImages[0],
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

  function importFromCode(code: string, stack: Stack) {
    // Set input state
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

    // Set the app state
    setAppState(AppState.CODE_READY);
  }

  return (
    <div className="mt-2 dark:bg-black dark:text-white">
      {IS_RUNNING_ON_CLOUD && <PicoBadge />}
      {IS_RUNNING_ON_CLOUD && (
        <TermsOfServiceDialog
          open={false}
          onOpenChange={handleTermDialogOpenChange}
        />
      )}
      <div className="lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-96 lg:flex-col">
        <div className="flex grow flex-col gap-y-2 overflow-y-auto border-r border-gray-200 bg-white px-6 dark:bg-zinc-950 dark:text-white">
          {/* Header with access to settings */}
          <div className="flex items-center justify-between mt-10 mb-2">
            <h1 className="text-2xl ">Screenshot to Code</h1>
            <SettingsDialog settings={settings} setSettings={setSettings} />
          </div>

          {/* Generation settings like stack and model */}
          <GenerationSettings
            settings={settings}
            setSettings={setSettings}
            selectedCodeGenerationModel={model}
          />

          {/* Show auto updated message when older models are choosen */}
          {showBetterModelMessage && <DeprecationMessage />}

          {/* Show tip link until coding is complete */}
          {appState !== AppState.CODE_READY && <TipLink />}

          {IS_RUNNING_ON_CLOUD &&
            !settings.openAiApiKey &&
            !IS_FREE_TRIAL_ENABLED &&
            subscriberTier === "free" && <OnboardingNote />}

          {appState === AppState.INITIAL && (
            <GenerateFromText doCreateFromText={doCreateFromText} />
          )}

          {/* Rest of the sidebar when we're not in the initial state */}
          {(appState === AppState.CODING ||
            appState === AppState.CODE_READY) && (
            <Sidebar
              showSelectAndEditFeature={showSelectAndEditFeature}
              doUpdate={doUpdate}
              regenerate={regenerate}
              cancelCodeGeneration={cancelCodeGeneration}
            />
          )}
        </div>
      </div>

      <main className="py-2 lg:pl-96">
        {!!navbarComponent && navbarComponent}

        {appState === AppState.INITIAL && (
          <StartPane
            doCreate={doCreate}
            importFromCode={importFromCode}
            settings={settings}
          />
        )}

        {(appState === AppState.CODING || appState === AppState.CODE_READY) && (
          <PreviewPane doUpdate={doUpdate} reset={reset} settings={settings} />
        )}
      </main>
    </div>
  );
}

export default App;
