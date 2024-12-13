import React, { useState } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";

interface Eval {
  input: string;
  outputs: string[];
}

// Update type to support any folder as winner
type Outcome = number | "tie" | null;

interface BestOfNEvalsResponse {
  evals: Eval[];
  folder_names: string[];
}

function BestOfNEvalsPage() {
  const [evals, setEvals] = React.useState<Eval[]>([]);
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  const [folderNames, setFolderNames] = useState<string[]>([]);
  // Track multiple folder paths
  const [folderPaths, setFolderPaths] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHtml, setSelectedHtml] = useState<string>("");

  // Add/remove folder input fields
  const addFolderInput = () => {
    setFolderPaths([...folderPaths, ""]);
  };

  const removeFolderInput = (index: number) => {
    setFolderPaths(folderPaths.filter((_, i) => i !== index));
  };

  const updateFolderPath = (index: number, value: string) => {
    const newPaths = [...folderPaths];
    newPaths[index] = value;
    setFolderPaths(newPaths);
  };

  // Calculate statistics for N models
  const calculateStats = () => {
    const totalVotes = outcomes.filter((o) => o !== null).length;
    const stats = folderNames.map((name, index) => {
      const wins = outcomes.filter((o) => o === index).length;
      const percentage = totalVotes
        ? ((wins / totalVotes) * 100).toFixed(2)
        : "0.00";
      return { name, wins, percentage };
    });
    const ties = outcomes.filter((o) => o === "tie").length;
    const tiePercentage = totalVotes
      ? ((ties / totalVotes) * 100).toFixed(2)
      : "0.00";

    return { stats, ties, tiePercentage, totalVotes };
  };

  const loadEvals = async () => {
    if (folderPaths.some((path) => !path)) {
      alert("Please enter all folder paths");
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      folderPaths.forEach((path, index) => {
        queryParams.append(
          `folder${index + 1}`,
          `/Users/abi/Downloads/${path}`
        );
      });

      const response = await fetch(
        `${HTTP_BACKEND_URL}/best-of-n-evals?${queryParams}`
      );
      const data: BestOfNEvalsResponse = await response.json();

      console.log(data.evals);

      setEvals(data.evals);
      setOutcomes(new Array(data.evals.length).fill(null));
      setFolderNames(data.folder_names);
    } catch (error) {
      console.error("Error loading evals:", error);
      alert(
        "Error loading evals. Please check the folder paths and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = (index: number, outcome: Outcome) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = outcome;
    setOutcomes(newOutcomes);
  };

  const stats = calculateStats();

  return (
    <div className="mx-auto">
      <div className="flex flex-col items-center justify-center w-full py-4 bg-zinc-950 text-white">
        <div className="flex flex-col gap-4 mb-4 w-full max-w-2xl px-4">
          {folderPaths.map((path, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => updateFolderPath(index, e.target.value)}
                placeholder="Enter folder name in Downloads"
                className="w-full px-4 py-2 rounded text-black"
              />
              {index > 0 && (
                <button
                  onClick={() => removeFolderInput(index)}
                  className="bg-red-500 px-3 py-2 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addFolderInput}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Add Model
          </button>

          <button
            onClick={loadEvals}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300"
          >
            {isLoading ? "Loading..." : "Start Comparison"}
          </button>
        </div>

        {evals.length > 0 && (
          <>
            <span className="text-2xl font-semibold">
              Total votes: {stats.totalVotes}
            </span>
            <div className="text-lg mt-2">
              {stats.stats.map((stat, i) => (
                <span key={i}>
                  {stat.name}: {stat.wins} ({stat.percentage}%) |{" "}
                </span>
              ))}
              <span>
                Ties: {stats.ties} ({stats.tiePercentage}%)
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-y-8 mt-4 mx-auto justify-center">
        {evals.map((e, index) => (
          <div className="flex flex-col justify-center" key={index}>
            <h2 className="font-bold text-lg ml-4 mb-2">
              Comparison {index + 1}
            </h2>

            <div className="w-full flex justify-center mb-4">
              <div className="w-1/2 max-w-2xl p-1 border">
                <img src={e.input} alt={`Input for comparison ${index}`} />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center px-4">
              {e.outputs.map((output, outputIndex) => (
                <div
                  className={`w-full sm:w-[calc(50%-1rem)] p-1 border ${
                    outcomes[index] === outputIndex
                      ? "border-green-500 border-4"
                      : ""
                  }`}
                  key={outputIndex}
                >
                  <div className="relative">
                    <div className="absolute top-0 left-0 bg-black text-white px-2 py-1 z-10">
                      {folderNames[outputIndex]}
                    </div>
                    <iframe
                      srcDoc={output}
                      className="w-full aspect-[3/2] transform scale-100"
                      style={{ minHeight: "400px" }}
                    ></iframe>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm"
                          onClick={() => setSelectedHtml(output)}
                        >
                          Full Screen
                        </button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh]">
                        <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 z-10">
                          {folderNames[outputIndex]}
                        </div>
                        <iframe
                          srcDoc={selectedHtml}
                          className="w-full h-full"
                        ></iframe>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-4 px-4">
              {folderNames.map((name, i) => (
                <button
                  key={i}
                  className={`px-4 py-2 rounded ${
                    outcomes[index] === i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  onClick={() => handleVote(index, i)}
                >
                  {name} Wins
                </button>
              ))}
              <button
                className={`px-4 py-2 rounded ${
                  outcomes[index] === "tie"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => handleVote(index, "tie")}
              >
                Tie
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BestOfNEvalsPage;
