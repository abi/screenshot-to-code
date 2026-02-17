import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { HTTP_BACKEND_URL } from "../../config";
import { BsCheckLg, BsChevronDown, BsChevronRight } from "react-icons/bs";
import InputFileSelector from "./InputFileSelector";
import EvalNavigation from "./EvalNavigation";

interface ModelResponse {
  models: string[];
  stacks: string[];
}

interface EvalProgressEvent {
  type: "start" | "model_start" | "task_complete" | "complete" | "error";
  message?: string;
  model?: string;
  model_index?: number;
  total_models?: number;
  completed_tasks?: number;
  total_tasks?: number;
  global_completed_tasks?: number;
  global_total_tasks?: number;
  input_file?: string;
  success?: boolean;
  error?: string;
  output_files?: string[];
  diff_mode?: boolean;
  total_skipped_existing?: number;
  model_tasks?: number;
  model_skipped_existing?: number;
}

interface FailedTask {
  model: string;
  inputFile: string;
  error: string;
}

function RunEvalsPage() {
  const faviconFlashIntervalRef = useRef<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [stacks, setStacks] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedStack, setSelectedStack] = useState<string>("html_tailwind");
  const [diffMode, setDiffMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showPaths, setShowPaths] = useState<boolean>(false);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("Idle");
  const [lastProcessedFile, setLastProcessedFile] = useState<string>("");
  const [failedTasks, setFailedTasks] = useState(0);
  const [failedTaskDetails, setFailedTaskDetails] = useState<FailedTask[]>([]);
  const [skippedExistingTasks, setSkippedExistingTasks] = useState(0);

  useEffect(() => {
    const fetchModels = async () => {
      const response = await fetch(`${HTTP_BACKEND_URL}/models`);
      const data: ModelResponse = await response.json();
      setModels(data.models);
      setStacks(data.stacks);
    };
    fetchModels();
  }, []);

  useEffect(() => {
    return () => {
      document.title = "Screenshot to Code";
      if (faviconFlashIntervalRef.current !== null) {
        window.clearInterval(faviconFlashIntervalRef.current);
      }
    };
  }, []);

  const setFavicon = (href: string) => {
    const faviconEl = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;
    if (faviconEl) {
      faviconEl.href = href;
    }
  };

  const stopFaviconFlash = () => {
    if (faviconFlashIntervalRef.current !== null) {
      window.clearInterval(faviconFlashIntervalRef.current);
      faviconFlashIntervalRef.current = null;
    }
    setFavicon("/favicon/main.png");
    window.removeEventListener("visibilitychange", stopWhenTabIsVisible);
    window.removeEventListener("focus", stopWhenTabIsVisible);
  };

  const stopWhenTabIsVisible = () => {
    if (document.visibilityState === "visible" && document.hasFocus()) {
      stopFaviconFlash();
    }
  };

  const flashFaviconOnComplete = () => {
    stopFaviconFlash();
    let useAlertIcon = false;
    faviconFlashIntervalRef.current = window.setInterval(() => {
      setFavicon(useAlertIcon ? "/favicon/coding.png" : "/favicon/main.png");
      useAlertIcon = !useAlertIcon;
    }, 450);
    window.addEventListener("visibilitychange", stopWhenTabIsVisible);
    window.addEventListener("focus", stopWhenTabIsVisible);
  };

  const runEvals = async (filesToRun?: string[]) => {
    const updateRunningTitle = (completed: number, total: number) => {
      if (total <= 0) {
        document.title = "Running Evals...";
        return;
      }
      const percent = Math.round((completed / total) * 100);
      document.title = `(${percent}%) Running Evals...`;
    };

    try {
      setIsRunning(true);
      document.title = "Running Evals...";
      setCompletedTasks(0);
      setTotalTasks(0);
      setCurrentModel("");
      setStatusMessage("Preparing evaluation run...");
      setLastProcessedFile("");
      setFailedTasks(0);
      setFailedTaskDetails([]);
      setSkippedExistingTasks(0);
      stopFaviconFlash();

      const runFiles = filesToRun ?? selectedFiles;

      const response = await fetch(`${HTTP_BACKEND_URL}/run_evals_stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          models: selectedModels,
          stack: selectedStack,
          files: runFiles,
          diff_mode: diffMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run evals");
      }

      if (!response.body) {
        throw new Error("No progress stream available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bufferedText = "";

      let streamDone = false;
      while (!streamDone) {
        const { value, done } = await reader.read();
        if (done) {
          streamDone = true;
          continue;
        }

        bufferedText += decoder.decode(value, { stream: true });
        const lines = bufferedText.split("\n");
        bufferedText = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line) as EvalProgressEvent;

          if (event.type === "start") {
            const eventTotalTasks = event.total_tasks ?? 0;
            setTotalTasks(eventTotalTasks);
            setSkippedExistingTasks(event.total_skipped_existing ?? 0);
            setStatusMessage(
              event.diff_mode
                ? `Starting diff run (${event.total_skipped_existing ?? 0} existing outputs skipped)...`
                : "Starting evaluation run..."
            );
            updateRunningTitle(0, eventTotalTasks);
          } else if (event.type === "model_start") {
            if (event.model) setCurrentModel(event.model);
            setStatusMessage(
              `Running model ${event.model_index ?? 1}/${event.total_models ?? selectedModels.length}: ${event.model ?? "Unknown"}${
                diffMode && (event.model_skipped_existing ?? 0) > 0
                  ? ` (${event.model_skipped_existing} skipped)`
                  : ""
              }`
            );
          } else if (event.type === "task_complete") {
            const globalCompleted = event.global_completed_tasks ?? 0;
            const globalTotal = event.global_total_tasks ?? totalTasks;
            setCompletedTasks(globalCompleted);
            if (event.input_file) setLastProcessedFile(event.input_file);
            if (event.success === false) {
              setFailedTasks((prev) => prev + 1);
              setFailedTaskDetails((prev) => [
                ...prev,
                {
                  model: event.model ?? "unknown",
                  inputFile: event.input_file ?? "unknown",
                  error: event.error ?? "Unknown error",
                },
              ]);
            }
            setStatusMessage(
              event.success === false
                ? `Failed: ${event.input_file ?? "unknown file"}`
                : `Processed: ${event.input_file ?? "unknown file"}`
            );
            updateRunningTitle(globalCompleted, globalTotal);
          } else if (event.type === "complete") {
            const finalCompleted = event.completed_tasks ?? completedTasks;
            const finalTotal = event.total_tasks ?? totalTasks;
            setCompletedTasks(finalCompleted);
            setTotalTasks(finalTotal);
            setStatusMessage("Evaluation run complete");
            console.log("Generated files:", event.output_files ?? []);
            updateRunningTitle(finalCompleted, finalTotal);
          } else if (event.type === "error") {
            throw new Error(event.message ?? "Eval run failed");
          }
        }
      }

      document.title = "✓ Evals Complete";
      flashFaviconOnComplete();
    } catch (error) {
      console.error("Error running evals:", error);
      document.title = "❌ Eval Error";
      setStatusMessage("Evaluation run failed");
      flashFaviconOnComplete();
      setTimeout(() => {
        document.title = "Screenshot to Code";
      }, 5000);
    } finally {
      setIsRunning(false);
    }
  };

  const handleModelToggle = (model: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((m) => m !== model);
      }
      return [...prev, model];
    });
  };

  const handleSelectAll = () => {
    setSelectedModels(models);
  };

  const handleFilesSelected = useCallback((files: string[]) => {
    setSelectedFiles(files);
  }, []);

  // Format model list for display in the summary
  const formatModelList = () => {
    if (selectedModels.length === 0) return "None";
    if (selectedModels.length === 1) return selectedModels[0];
    if (selectedModels.length <= 2) return selectedModels.join(", ");
    return `${selectedModels.slice(0, 2).join(", ")} +${selectedModels.length - 2} more`;
  };

  const canRunEvals = selectedModels.length > 0 && selectedFiles.length > 0;
  const failedFilesForRerun = Array.from(
    new Set(failedTaskDetails.map((task) => task.inputFile).filter(Boolean))
  );
  const canRerunFailures =
    !isRunning &&
    selectedModels.length > 0 &&
    failedFilesForRerun.length > 0;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div>
      <EvalNavigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Unified Header with Configuration Summary */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4 max-w-5xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-between items-center">
              <h1 className="text-2xl font-bold">Run Evaluations</h1>
              
              <Button
                onClick={() => void runEvals()}
                disabled={isRunning || !canRunEvals}
                className={`min-w-[120px] ${isRunning ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isRunning ? "Running..." : "Run Evals"}
              </Button>
            </div>

            {diffMode && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Diff mode enabled: only input files missing outputs in today's model folders will run. Existing outputs are skipped and never overwritten.
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">Models</span>
                <span className="text-sm text-gray-600 font-mono">{formatModelList()}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">Stack</span>
                <span className="text-sm text-gray-600 font-mono">{selectedStack}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700">Input Files</span>
                <span className="text-sm text-gray-600">{selectedFiles.length} selected</span>
              </div>
            </div>
            
            <div 
              className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer mt-1 hover:bg-gray-50 inline-block rounded px-2 py-1"
              onClick={() => setShowPaths(!showPaths)}
            >
              {showPaths ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
              <span className="font-medium">Paths</span>
            </div>
            
            {showPaths && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded-md">
                <div>
                  <span className="font-medium">Input path:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded">
                    backend/evals_data/inputs
                  </code>
                </div>
                <div>
                  <span className="font-medium">Output path:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded">
                    backend/evals_data/outputs
                  </code>
                </div>
              </div>
            )}

            {(isRunning || totalTasks > 0) && (
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{statusMessage}</span>
                  <span className="text-gray-600">
                    {completedTasks} / {totalTasks || "?"} tasks
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2 mb-2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                  <span>
                    Current model:{" "}
                    <span className="font-mono">{currentModel || "-"}</span>
                  </span>
                  <span>
                    Failures: <span className="font-medium">{failedTasks}</span>
                  </span>
                  <span className="truncate" title={lastProcessedFile}>
                    Last file:{" "}
                    <span className="font-mono">{lastProcessedFile || "-"}</span>
                  </span>
                </div>
                {diffMode && (
                  <div className="mt-2 text-xs text-emerald-700">
                    Existing outputs skipped:{" "}
                    <span className="font-medium">{skippedExistingTasks}</span>
                  </div>
                )}
                {failedTaskDetails.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-700">
                        Failures ({failedTaskDetails.length})
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canRerunFailures}
                        onClick={() => void runEvals(failedFilesForRerun)}
                        className="h-7 px-2 text-xs"
                      >
                        Re-run failures
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-md border border-red-100 bg-red-50/40">
                      <ul className="divide-y divide-red-100">
                        {failedTaskDetails.map((task, index) => (
                          <li key={`${task.model}-${task.inputFile}-${index}`} className="px-3 py-2 text-xs">
                            <div className="font-medium text-red-800">
                              {task.inputFile}
                            </div>
                            <div className="text-red-700">
                              Model: <span className="font-mono">{task.model}</span>
                            </div>
                            <div className="text-red-700 break-words">
                              Error: {task.error}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Model Selection Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg">
              <h2 className="font-medium">Select Models</h2>
            </div>
            <div className="p-3">
              <div className="border rounded-md max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-1 divide-y divide-gray-100">
                  {models.map((model) => (
                    <div
                      key={model}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                        selectedModels.includes(model)
                          ? "bg-blue-50"
                          : ""
                      }`}
                      onClick={() => handleModelToggle(model)}
                    >
                      <span className="text-sm truncate" title={model}>{model}</span>
                      {selectedModels.includes(model) ? (
                        <BsCheckLg className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 border rounded-sm flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <p className="text-gray-500">
                  Selected: {selectedModels.length} / {models.length}
                </p>
                <div className="space-x-2">
                  {selectedModels.length < models.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
                    >
                      Select all
                    </Button>
                  )}
                  {selectedModels.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedModels([])}
                      className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stack Selection Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg">
              <h2 className="font-medium">Select Stack</h2>
            </div>
            <div className="p-3">
              <select
                value={selectedStack}
                onChange={(e) => setSelectedStack(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {stacks.map((stack) => (
                  <option key={stack} value={stack}>
                    {stack}
                  </option>
                ))}
              </select>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diffMode}
                  onChange={(e) => setDiffMode(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Diff mode (only run missing outputs, no overwrite)</span>
              </label>
            </div>
          </div>

          {/* Input Files Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm lg:col-span-1 md:col-span-2">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg">
              <h2 className="font-medium">Select Input Files</h2>
            </div>
            <div className="p-3">
              <InputFileSelector onFilesSelected={handleFilesSelected} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunEvalsPage;
