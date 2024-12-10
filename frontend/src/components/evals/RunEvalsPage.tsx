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
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedStack, setSelectedStack] = useState<string>("");

  useEffect(() => {
    const fetchModels = async () => {
      const response = await fetch(`${HTTP_BACKEND_URL}/models`);
      const data: ModelResponse = await response.json();
      setModels(data.models);
      setStacks(data.stacks);
      if (data.models.length > 0) {
        setSelectedModel(data.models[0]);
      }
      if (data.stacks.length > 0) {
        setSelectedStack(data.stacks[0]);
      }
    };
    fetchModels();
  }, []);

  const runEvals = async () => {
    try {
      setIsRunning(true);
      const response = await fetch(
        `${HTTP_BACKEND_URL}/run_evals?model=${selectedModel}&stack=${selectedStack}`,
        {
          method: "POST",
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
            Select Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="shadow border rounded w-full py-2 px-3 text-gray-700"
            required
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
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

      <Button onClick={runEvals} disabled={isRunning} className="w-48 mt-6">
        {isRunning ? "Running Evals..." : "Run Evals"}
      </Button>
    </div>
  );
}

export default RunEvalsPage;
