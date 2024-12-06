import React, { useEffect, useState } from "react";
import { HTTP_BACKEND_URL } from "../../config";

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

  // Calculate statistics
  const totalVotes = outcomes.filter((o) => o !== null).length;
  const leftWins = outcomes.filter((o) => o === "left").length;
  const rightWins = outcomes.filter((o) => o === "right").length;
  const ties = outcomes.filter((o) => o === "tie").length;

  // Calculate percentages
  const leftPercentage = totalVotes
    ? ((leftWins / totalVotes) * 100).toFixed(1)
    : "0.0";
  const rightPercentage = totalVotes
    ? ((rightWins / totalVotes) * 100).toFixed(1)
    : "0.0";
  const tiePercentage = totalVotes
    ? ((ties / totalVotes) * 100).toFixed(1)
    : "0.0";

  useEffect(() => {
    if (evals.length > 0) return;

    fetch(`${HTTP_BACKEND_URL}/pairwise-evals`)
      .then((res) => res.json())
      .then((data: PairwiseEvalsResponse) => {
        setEvals(data.evals);
        setOutcomes(new Array(data.evals.length).fill(null));
        setFolderNames({
          left: data.folder1_name,
          right: data.folder2_name,
        });
      });
  }, [evals]);

  const handleVote = (index: number, outcome: Outcome) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = outcome;
    setOutcomes(newOutcomes);
  };

  return (
    <div className="mx-auto">
      <div className="flex flex-col items-center justify-center w-full py-4 bg-zinc-950 text-white">
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
                  <iframe
                    srcDoc={output}
                    className="w-[1200px] h-[800px] transform scale-[0.55]"
                    style={{ transformOrigin: "top left" }}
                  ></iframe>
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
