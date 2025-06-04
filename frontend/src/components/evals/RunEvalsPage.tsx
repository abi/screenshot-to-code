import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { BsCheckLg, BsChevronDown, BsChevronRight } from "react-icons/bs";
import InputFileSelector from "./InputFileSelector";
import EvalNavigation from "./EvalNavigation";

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
  const [showPaths, setShowPaths] = useState<boolean>(false);

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

  // Format model list for display in the summary
  const formatModelList = () => {
    if (selectedModels.length === 0) return "None";
    if (selectedModels.length === 1) return selectedModels[0];
    if (selectedModels.length <= 2) return selectedModels.join(", ");
    return `${selectedModels.slice(0, 2).join(", ")} +${selectedModels.length - 2} more`;
  };

  const canRunEvals = selectedModels.length > 0 && selectedFiles.length > 0;

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
                onClick={runEvals}
                disabled={isRunning || !canRunEvals}
                className={`min-w-[120px] ${isRunning ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isRunning ? "Running..." : "Run Evals"}
              </Button>
            </div>
            
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
