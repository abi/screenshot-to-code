import { useEffect, useRef } from "react";
import { generateCode } from "./generateCode";
import SettingsDialog from "./components/settings/SettingsDialog";
import { AppState, CodeGenerationParams, EditorTheme, Settings } from "./types";
import { IS_RUNNING_ON_CLOUD } from "./config";
import { PicoBadge } from "./components/messages/PicoBadge";
import { OnboardingNote } from "./components/messages/OnboardingNote";
import { usePersistedState } from "./hooks/usePersistedState";
import TermsOfServiceDialog from "./components/TermsOfServiceDialog";
import { USER_CLOSE_WEB_SOCKET_CODE } from "./constants";
import { extractHistory } from "./components/history/utils";
import toast from "react-hot-toast";
import { Stack } from "./lib/stacks";
import { CodeGenerationModel } from "./lib/models";
import useBrowserTabIndicator from "./hooks/useBrowserTabIndicator";
// import TipLink from "./components/messages/TipLink";
import { useAppStore } from "./store/app-store";
import { useProjectStore } from "./store/project-store";
import Sidebar from "./components/sidebar/Sidebar";
import PreviewPane from "./components/preview/PreviewPane";
import DeprecationMessage from "./components/messages/DeprecationMessage";
import { GenerationSettings } from "./components/settings/GenerationSettings";
import StartPane from "./components/start-pane/StartPane";
import { Commit } from "./components/commits/types";
import { createCommit } from "./components/commits/utils";

function App() {
  const {
    // Inputs
    inputMode,
    setInputMode,
    isImportedFromCode,
    setIsImportedFromCode,
    referenceImages,
    setReferenceImages,

    head,
    commits,
    addCommit,
    removeCommit,
    setHead,
    appendCommitCode,
    setCommitCode,
    resetCommits,
    resetHead,

    // Outputs
    appendExecutionConsole,
    resetExecutionConsoles,
  } = useProjectStore();

  const {
    disableInSelectAndEditMode,
    setUpdateInstruction,
    appState,
    setAppState,
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
    setUpdateInstruction("");
    disableInSelectAndEditMode();
    resetExecutionConsoles();

    resetCommits();
    resetHead();

    // Inputs
    setInputMode("image");
    setReferenceImages([]);
    setIsImportedFromCode(false);
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
    doCreate(referenceImages, inputMode);
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

  function doGenerateCode(params: CodeGenerationParams) {
    // Reset the execution console
    resetExecutionConsoles();

    // Set the app state
    setAppState(AppState.CODING);

    // Merge settings with params
    const updatedParams = { ...params, ...settings };

    const baseCommitObject = {
      variants: [{ code: "" }, { code: "" }],
    };

    const commitInputObject =
      params.generationType === "create"
        ? {
            ...baseCommitObject,
            type: "ai_create" as const,
            parentHash: null,
            inputs: { image_url: referenceImages[0] },
          }
        : {
            ...baseCommitObject,
            type: "ai_edit" as const,
            parentHash: head,
            inputs: {
              prompt: params.history
                ? params.history[params.history.length - 1]
                : "",
            },
          };

    // Create a new commit and set it as the head
    const commit = createCommit(commitInputObject);
    addCommit(commit);
    setHead(commit.hash);

    generateCode(
      wsRef,
      updatedParams,
      // On change
      (token, variantIndex) => {
        appendCommitCode(commit.hash, variantIndex, token);
      },
      // On set code
      (code, variantIndex) => {
        setCommitCode(commit.hash, variantIndex, code);
      },
      // On status update
      (line, variantIndex) => appendExecutionConsole(variantIndex, line),
      // On cancel
      () => {
        cancelCodeGenerationAndReset(commit);
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

    // Set the input states
    setReferenceImages(referenceImages);
    setInputMode(inputMode);

    // Kick off the code generation
    if (referenceImages.length > 0) {
      doGenerateCode({
        generationType: "create",
        image: referenceImages[0],
        inputMode,
      });
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

    if (head === null) {
      toast.error(
        "No current version set. Contact support or open a Github issue."
      );
      throw new Error("Update called with no head");
    }

    let historyTree;
    try {
      historyTree = extractHistory(head, commits);
    } catch {
      toast.error(
        "Version history is invalid. This shouldn't happen. Please contact support or open a Github issue."
      );
      throw new Error("Invalid version history");
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

    doGenerateCode({
      generationType: "update",
      inputMode,
      image: referenceImages[0],
      history: updatedHistory,
      isImportedFromCode,
    });

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
    // Reset any existing state
    reset();

    // Set input state
    setIsImportedFromCode(true);

    // Set up this project
    setStack(stack);

    // Create a new commit and set it as the head
    const commit = createCommit({
      type: "code_create",
      parentHash: null,
      variants: [{ code }],
      inputs: null,
    });
    addCommit(commit);
    setHead(commit.hash);

    // Set the app state
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
          {/* Header with access to settings */}
          <div className="flex items-center justify-between mt-10 mb-2">
            <h1 className="text-2xl ">Screenshot to Code</h1>
            <SettingsDialog settings={settings} setSettings={setSettings} />
          </div>

          {/* Generation settings like stack and model */}
          <GenerationSettings settings={settings} setSettings={setSettings} />

          {/* Show auto updated message when older models are choosen */}
          {showBetterModelMessage && <DeprecationMessage />}

          {/* Show tip link until coding is complete */}
          {/* {appState !== AppState.CODE_READY && <TipLink />} */}

          {IS_RUNNING_ON_CLOUD && !settings.openAiApiKey && <OnboardingNote />}

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
