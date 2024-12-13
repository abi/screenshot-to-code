import React, { useState } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import RatingPicker from "./RatingPicker";

interface Eval {
  input: string;
  outputs: string[];
}

interface RatingCriteria {
  stackAdherence: number;
  accuracy: number;
  codeQuality: number;
  mobileResponsiveness: number;
  imageCaptionQuality: number;
}

interface OutputDisplay {
  showSource: boolean;
}

function EvalsPage() {
  const [evals, setEvals] = React.useState<Eval[]>([]);
  const [ratings, setRatings] = React.useState<RatingCriteria[]>([]);
  const [folderPath, setFolderPath] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [outputDisplays, setOutputDisplays] = useState<OutputDisplay[]>([]);

  const calculateScores = () => {
    if (ratings.length === 0) {
      return {
        stackAdherence: { total: 0, max: 0, percentage: "0.00" },
        accuracy: { total: 0, max: 0, percentage: "0.00" },
        codeQuality: { total: 0, max: 0, percentage: "0.00" },
        mobileResponsiveness: { total: 0, max: 0, percentage: "0.00" },
        imageCaptionQuality: { total: 0, max: 0, percentage: "0.00" },
      };
    }

    const maxPerCriterion = ratings.length * 5; // max score of 5 * number of evals

    const totals = ratings.reduce(
      (acc, rating) => ({
        stackAdherence: acc.stackAdherence + rating.stackAdherence,
        accuracy: acc.accuracy + rating.accuracy,
        codeQuality: acc.codeQuality + rating.codeQuality,
        mobileResponsiveness:
          acc.mobileResponsiveness + rating.mobileResponsiveness,
        imageCaptionQuality:
          acc.imageCaptionQuality + rating.imageCaptionQuality,
      }),
      {
        stackAdherence: 0,
        accuracy: 0,
        codeQuality: 0,
        mobileResponsiveness: 0,
        imageCaptionQuality: 0,
      }
    );

    return Object.entries(totals).reduce(
      (acc, [key, total]) => ({
        ...acc,
        [key]: {
          total,
          max: maxPerCriterion,
          percentage: ((total / maxPerCriterion) * 100).toFixed(2),
        },
      }),
      {} as Record<
        keyof RatingCriteria,
        { total: number; max: number; percentage: string }
      >
    );
  };

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
      setRatings(
        data.map(() => ({
          stackAdherence: 0,
          accuracy: 0,
          codeQuality: 0,
          mobileResponsiveness: 0,
          imageCaptionQuality: 0,
        }))
      );
    } catch (error) {
      console.error("Error loading evals:", error);
      alert("Error loading evals. Please check the folder path and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateRating = (
    index: number,
    criterion: keyof RatingCriteria,
    value: number
  ) => {
    const newRatings = [...ratings];
    newRatings[index] = {
      ...newRatings[index],
      [criterion]: value,
    };
    setRatings(newRatings);
  };

  const toggleSourceView = (evalIndex: number) => {
    const newDisplays = [...outputDisplays];
    if (!newDisplays[evalIndex]) {
      newDisplays[evalIndex] = { showSource: false };
    }
    newDisplays[evalIndex] = { showSource: !newDisplays[evalIndex].showSource };
    setOutputDisplays(newDisplays);
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
          <div className="flex flex-col items-center gap-2 text-lg">
            <h2 className="text-2xl font-semibold mb-2">Scores by Category</h2>
            {Object.entries(calculateScores()).map(([criterion, score]) => (
              <div key={criterion} className="flex gap-x-4 items-center">
                <span className="min-w-[200px] text-right capitalize">
                  {criterion.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <span>
                  {score.total} / {score.max} ({score.percentage}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-y-8 mt-4 mx-auto justify-center">
        {evals.map((e, index) => (
          <div className="flex flex-col justify-center" key={index}>
            <h2 className="font-bold text-lg ml-4">Evaluation {index + 1}</h2>
            <div className="flex gap-x-2 justify-center ml-4">
              <div className="w-1/2 p-1 border">
                <img src={e.input} alt={`Input for eval ${index}`} />
              </div>
              {e.outputs.map((output, outputIndex) => (
                <div className="w-1/2 p-1 border" key={outputIndex}>
                  <div className="mb-2">
                    <button
                      onClick={() => toggleSourceView(index)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
                    >
                      {outputDisplays[index]?.showSource ? "Show Preview" : "Show Source"}
                    </button>
                  </div>
                  {outputDisplays[index]?.showSource ? (
                    <pre className="whitespace-pre-wrap text-sm p-2 bg-gray-100 max-h-[480px] overflow-auto">
                      {output}
                    </pre>
                  ) : (
                    <iframe
                      srcDoc={output}
                      className="w-[1200px] h-[800px] transform scale-[0.60]"
                      style={{ transformOrigin: "top left" }}
                    ></iframe>
                  )}
                </div>
              ))}
            </div>
            <div className="ml-8 mt-4 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-x-4">
                  <span className="min-w-[160px]">Stack Adherence:</span>
                  <RatingPicker
                    onSelect={(rating) =>
                      updateRating(index, "stackAdherence", rating)
                    }
                    maxRating={5}
                    value={ratings[index].stackAdherence}
                  />
                </div>
                <div className="flex items-center gap-x-4">
                  <span className="min-w-[160px]">Accuracy:</span>
                  <RatingPicker
                    onSelect={(rating) =>
                      updateRating(index, "accuracy", rating)
                    }
                    maxRating={5}
                    value={ratings[index].accuracy}
                  />
                </div>
                <div className="flex items-center gap-x-4">
                  <span className="min-w-[160px]">Code Quality:</span>
                  <RatingPicker
                    onSelect={(rating) =>
                      updateRating(index, "codeQuality", rating)
                    }
                    maxRating={5}
                    value={ratings[index].codeQuality}
                  />
                </div>
                <div className="flex items-center gap-x-4">
                  <span className="min-w-[160px]">Mobile Responsiveness:</span>
                  <RatingPicker
                    onSelect={(rating) =>
                      updateRating(index, "mobileResponsiveness", rating)
                    }
                    maxRating={5}
                    value={ratings[index].mobileResponsiveness}
                  />
                </div>
                <div className="flex items-center gap-x-4">
                  <span className="min-w-[160px]">Image Caption Quality:</span>
                  <RatingPicker
                    onSelect={(rating) =>
                      updateRating(index, "imageCaptionQuality", rating)
                    }
                    maxRating={5}
                    value={ratings[index].imageCaptionQuality}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EvalsPage;
