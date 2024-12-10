import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { useNavigate } from "react-router-dom";

interface ModelResponse {
  models: string[];
}

function RunEvalsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");

  useEffect(() => {
    console.log("fetching models");

    const fetchModels = async () => {
      const response = await fetch(`${HTTP_BACKEND_URL}/models`);
      const data: ModelResponse = await response.json();
      setModels(data.models);
      if (data.models.length > 0) {
        setSelectedModel(data.models[0]);
      }
    };
    fetchModels();
  }, []);

  const runEvals = async () => {
    try {
      setIsRunning(true);
      const response = await fetch(
        `${HTTP_BACKEND_URL}/run_evals?model=${selectedModel}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to run evals");
      }

      const outputFiles = await response.json();
      console.log("Generated files:", outputFiles);

      // Navigate to evals page after completion
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
      <div className="mb-4">
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
      <Button onClick={runEvals} disabled={isRunning} className="w-48">
        {isRunning ? "Running Evals..." : "Run Evals"}
      </Button>
    </div>
  );
}

export default RunEvalsPage;
