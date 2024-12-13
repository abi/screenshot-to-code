import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { BsCheckLg } from "react-icons/bs";

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-8">Run Evaluations</h1>

      <div className="max-w-md text-center mb-8 text-gray-600">
        <p className="mb-2">
          Evaluation inputs will be read from:
          <code className="block bg-gray-100 p-1 mt-1 rounded">
            backend/evals_data/inputs
          </code>
        </p>
        <p>
          Results will be saved to:
          <code className="block bg-gray-100 p-1 mt-1 rounded">
            backend/evals_data/outputs
          </code>
        </p>
      </div>

      <div className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Select Models
          </label>
          <div className="border rounded-md p-2 space-y-2">
            {models.map((model) => (
              <div
                key={model}
                className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  selectedModels.includes(model)
                    ? "bg-blue-50 border border-blue-200"
                    : ""
                }`}
                onClick={() => handleModelToggle(model)}
              >
                <span className="text-sm">{model}</span>
                {selectedModels.includes(model) ? (
                  <BsCheckLg className="h-4 w-4 text-blue-500" />
                ) : (
                  <div className="h-4 w-4 border rounded-sm" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-sm text-gray-500">
              Selected: {selectedModels.length} model
              {selectedModels.length !== 1 ? "s" : ""}
            </p>
            <div className="space-x-2">
              {selectedModels.length < models.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Select all
                </Button>
              )}
              {selectedModels.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedModels([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Select Stack
          </label>
          <select
            value={selectedStack}
            onChange={(e) => setSelectedStack(e.target.value)}
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            required
          >
            {stacks.map((stack) => (
              <option key={stack} value={stack}>
                {stack}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        onClick={runEvals}
        disabled={isRunning || selectedModels.length === 0}
        className="w-48 mt-6"
      >
        {isRunning ? "Running Evals..." : "Run Evals"}
      </Button>
    </div>
  );
}

export default RunEvalsPage;
