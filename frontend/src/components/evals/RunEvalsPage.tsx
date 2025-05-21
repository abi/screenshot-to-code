import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { BsCheckLg } from "react-icons/bs";
import InputFileSelector from "./InputFileSelector";

interface ModelResponse {
  models: string[];
  stacks: string[];
}

function RunEvalsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [stacks, setStacks] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedStack, setSelectedStack] = useState<string>("html_tailwind");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

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
    };
  }, []);

  const runEvals = async () => {
    try {
      setIsRunning(true);
      document.title = "Running Evals...";

      const response = await fetch(`${HTTP_BACKEND_URL}/run_evals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          models: selectedModels,
          stack: selectedStack,
          files: selectedFiles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run evals");
      }

      const outputFiles = await response.json();
      console.log("Generated files:", outputFiles);

      document.title = "✓ Evals Complete";
    } catch (error) {
      console.error("Error running evals:", error);
      document.title = "❌ Eval Error";
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

  const handleFilesSelected = (files: string[]) => {
    setSelectedFiles(files);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Run Evaluations</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-600 mx-auto max-w-5xl">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="font-medium">Evaluation inputs:</p>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              backend/evals_data/inputs
            </code>
          </div>
          <div>
            <p className="font-medium">Results will be saved to:</p>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              backend/evals_data/outputs
            </code>
          </div>
          <Button
            onClick={runEvals}
            disabled={isRunning || selectedModels.length === 0 || selectedFiles.length === 0}
            className={`px-6 ${isRunning ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {isRunning ? "Running Evals..." : "Run Evals"}
          </Button>
        </div>
      </div>

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

      {/* Summary Section */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4 max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Configuration Summary</p>
            <p className="text-xs text-gray-500">
              {selectedModels.length} models • {selectedStack} • {selectedFiles.length} files
            </p>
          </div>
          <Button
            onClick={runEvals}
            disabled={isRunning || selectedModels.length === 0 || selectedFiles.length === 0}
            className={`w-36 ${isRunning ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {isRunning ? "Running Evals..." : "Run Evals"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RunEvalsPage;
