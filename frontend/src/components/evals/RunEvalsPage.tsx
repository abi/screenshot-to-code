import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { useNavigate } from "react-router-dom";

interface ModelResponse {
  models: string[];
  stacks: string[];
}

function RunEvalsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();
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
      if (data.models.length > 0) {
        setSelectedModels([data.models[0]]);
      }
    };
    fetchModels();
  }, []);

  const runEvals = async () => {
    try {
      setIsRunning(true);
      const response = await fetch(
        `${HTTP_BACKEND_URL}/run_evals`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            models: selectedModels,
            stack: selectedStack
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to run evals");
      }

      const outputFiles = await response.json();
      console.log("Generated files:", outputFiles);

      navigate("/evals");
    } catch (error) {
      console.error("Error running evals:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleModelSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions).map(option => option.value);
    setSelectedModels(selectedOptions);
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
          <select
            multiple
            value={selectedModels}
            onChange={handleModelSelection}
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            required
            size={4}
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Hold Ctrl/Cmd to select multiple models
          </p>
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
