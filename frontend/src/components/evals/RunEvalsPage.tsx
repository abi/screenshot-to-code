import { useState } from "react";
import { Button } from "../ui/button";
import { HTTP_BACKEND_URL } from "../../config";
import { useNavigate } from "react-router-dom";

function RunEvalsPage() {
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();

  const runEvals = async () => {
    try {
      setIsRunning(true);
      const response = await fetch(`${HTTP_BACKEND_URL}/run_evals`, {
        method: "POST",
      });

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
      <Button onClick={runEvals} disabled={isRunning} className="w-48">
        {isRunning ? "Running Evals..." : "Run Evals"}
      </Button>
    </div>
  );
}

export default RunEvalsPage;
