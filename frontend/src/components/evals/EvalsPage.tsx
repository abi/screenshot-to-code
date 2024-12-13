import React, { useState } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import RatingPicker from "./RatingPicker";

interface Eval {
  input: string;
  outputs: string[];
}

function EvalsPage() {
  const [evals, setEvals] = React.useState<Eval[]>([]);
  const [ratings, setRatings] = React.useState<number[]>([]);
  const [folderPath, setFolderPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const total = ratings.reduce((a, b) => a + b, 0);
  const max = ratings.length * 4;
  const score = ((total / max) * 100 || 0).toFixed(2);

  const loadEvals = async () => {
    if (!folderPath) {
      alert("Please enter a folder path");
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        folder: `/Users/abi/Downloads/${folderPath}`,
      });

      const response = await fetch(`${HTTP_BACKEND_URL}/evals?${queryParams}`);
      const data = await response.json();

      console.log(data);

      setEvals(data);
      setRatings(new Array(data.length).fill(0));
    } catch (error) {
      console.error("Error loading evals:", error);
      alert("Error loading evals. Please check the folder path and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto">
      <div className="flex flex-col items-center justify-center w-full py-4 bg-zinc-950 text-white">
        <div className="flex flex-col gap-4 mb-4 w-full max-w-2xl px-4">
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="Enter folder name in Downloads"
            className="w-full px-4 py-2 rounded text-black"
          />
          <button
            onClick={loadEvals}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300"
          >
            {isLoading ? "Loading..." : "Load Evals"}
          </button>
        </div>

        {evals.length > 0 && (
          <span className="text-2xl font-semibold">
            Total: {total} out of {max} ({score}%)
          </span>
        )}
      </div>

      <div className="flex flex-col gap-y-4 mt-4 mx-auto justify-center">
        {evals.map((e, index) => (
          <div className="flex flex-col justify-center" key={index}>
            <h2 className="font-bold text-lg ml-4">{index}</h2>
            <div className="flex gap-x-2 justify-center ml-4">
              {/* Update w if N changes to a fixed number like w-[600px] */}
              <div className="w-1/2 p-1 border">
                <img src={e.input} alt={`Input for eval ${index}`} />
              </div>
              {e.outputs.map((output, outputIndex) => (
                <div className="w-1/2 p-1 border" key={outputIndex}>
                  {/* Put output into an iframe */}
                  <iframe
                    srcDoc={output}
                    className="w-[1200px] h-[800px] transform scale-[0.60]"
                    style={{ transformOrigin: "top left" }}
                  ></iframe>
                </div>
              ))}
            </div>
            <div className="ml-8 mt-4 flex justify-center">
              <RatingPicker
                onSelect={(rating) => {
                  const newRatings = [...ratings];
                  newRatings[index] = rating;
                  setRatings(newRatings);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EvalsPage;
