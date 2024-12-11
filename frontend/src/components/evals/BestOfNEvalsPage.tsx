import React, { useState } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";

interface Eval {
  input: string;
  outputs: string[];
}

type Outcome = "left" | "right" | "tie" | null;

interface PairwiseEvalsResponse {
  evals: Eval[];
  folder1_name: string;
  folder2_name: string;
}

function PairwiseEvalsPage() {
  const [evals, setEvals] = React.useState<Eval[]>([]);
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  const [folderNames, setFolderNames] = useState<{
    left: string;
    right: string;
  }>({
    left: "",
    right: "",
  });
  const [folder1Path, setFolder1Path] = useState("");
  const [folder2Path, setFolder2Path] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHtml, setSelectedHtml] = useState<string>("");

  // Calculate statistics
  const totalVotes = outcomes.filter((o) => o !== null).length;
  const leftWins = outcomes.filter((o) => o === "left").length;
  const rightWins = outcomes.filter((o) => o === "right").length;
  const ties = outcomes.filter((o) => o === "tie").length;
  // Calculate percentages
  const leftPercentage = totalVotes
    ? ((leftWins / totalVotes) * 100).toFixed(2)
    : "0.00";
  const rightPercentage = totalVotes
    ? ((rightWins / totalVotes) * 100).toFixed(2)
    : "0.00";
  const tiePercentage = totalVotes
    ? ((ties / totalVotes) * 100).toFixed(2)
    : "0.00";

  const loadEvals = async () => {
    if (!folder1Path || !folder2Path) {
      alert("Please enter both folder paths");
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        folder1: `/Users/abi/Downloads/${folder1Path}`,
        folder2: `/Users/abi/Downloads/${folder2Path}`,
      });

      const response = await fetch(
        `${HTTP_BACKEND_URL}/pairwise-evals?${queryParams}`
      );
      const data: PairwiseEvalsResponse = await response.json();

      setEvals(data.evals);
      setOutcomes(new Array(data.evals.length).fill(null));
      setFolderNames({
        left: data.folder1_name,
        right: data.folder2_name,
      });
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

  return (
    <div className="mx-auto">
      <div className="flex flex-col items-center justify-center w-full py-4 bg-zinc-950 text-white">
        <div className="flex flex-col gap-4 mb-4 w-full max-w-2xl px-4">
          <input
            type="text"
            value={folder1Path}
            onChange={(e) => setFolder1Path(e.target.value)}
            placeholder="Enter folder name in Downloads"
            className="w-full px-4 py-2 rounded text-black"
          />
          <input
            type="text"
            value={folder2Path}
            onChange={(e) => setFolder2Path(e.target.value)}
            placeholder="Enter folder name in Downloads"
            className="w-full px-4 py-2 rounded text-black"
          />
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
              Total votes: {totalVotes}
            </span>
            <div className="text-lg mt-2">
              <span>
                {folderNames.left}: {leftWins} ({leftPercentage}%) |{" "}
              </span>
              <span>
                {folderNames.right}: {rightWins} ({rightPercentage}%) |{" "}
              </span>
              <span>
                Ties: {ties} ({tiePercentage}%)
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
              <div className="w-1/2 p-1 border">
                <img src={e.input} alt={`Input for comparison ${index}`} />
              </div>
            </div>

            <div className="flex gap-x-4 justify-center">
              {e.outputs.slice(0, 2).map((output, outputIndex) => (
                <div
                  className={`w-1/2 p-1 border ${
                    outcomes[index] === (outputIndex === 0 ? "left" : "right")
                      ? "border-green-500 border-4"
                      : ""
                  }`}
                  key={outputIndex}
                >
                  <div className="relative">
                    <iframe
                      srcDoc={output}
                      className="w-[1200px] h-[800px] transform scale-[0.55]"
                      style={{ transformOrigin: "top left" }}
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
                        <iframe
                          srcDoc={selectedHtml}
                          className="w-[1400px] h-[800px] transform scale-[0.90]"
                        ></iframe>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-x-4 mt-4">
              <button
                className={`px-4 py-2 rounded ${
                  outcomes[index] === "left"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => handleVote(index, "left")}
              >
                Left Wins
              </button>
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
              <button
                className={`px-4 py-2 rounded ${
                  outcomes[index] === "right"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => handleVote(index, "right")}
              >
                Right Wins
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PairwiseEvalsPage;
