import React, { useState, useEffect, useRef } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import EvalNavigation from "./EvalNavigation";

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
  
  // Navigation state
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  
  // Refs for synchronized scrolling
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  // Synchronized scrolling effect
  useEffect(() => {
    const setupSyncScrolling = () => {
      const iframes = iframeRefs.current.filter(Boolean);
      if (iframes.length < 2) return;

      const syncScroll = (sourceIframe: HTMLIFrameElement) => {
        try {
          const sourceDocument = sourceIframe.contentDocument || sourceIframe.contentWindow?.document;
          if (!sourceDocument) return;

          const syncHandler = () => {
            const scrollTop = sourceDocument.documentElement.scrollTop || sourceDocument.body.scrollTop;
            const scrollLeft = sourceDocument.documentElement.scrollLeft || sourceDocument.body.scrollLeft;

            iframes.forEach(iframe => {
              if (!iframe || iframe === sourceIframe) return;
              try {
                const targetDocument = iframe.contentDocument || iframe.contentWindow?.document;
                if (targetDocument) {
                  targetDocument.documentElement.scrollTop = scrollTop;
                  targetDocument.body.scrollTop = scrollTop;
                  targetDocument.documentElement.scrollLeft = scrollLeft;
                  targetDocument.body.scrollLeft = scrollLeft;
                }
              } catch (e) {
                // Ignore cross-origin errors
              }
            });
          };

          sourceDocument.addEventListener('scroll', syncHandler);
          return () => sourceDocument.removeEventListener('scroll', syncHandler);
        } catch (e) {
          // Ignore cross-origin errors
        }
      };

      const cleanupFunctions = iframes.map(iframe => iframe ? syncScroll(iframe) : null).filter(Boolean);
      return () => cleanupFunctions.forEach(cleanup => cleanup?.());
    };

    // Wait for iframes to load
    const timer = setTimeout(setupSyncScrolling, 1000);
    return () => clearTimeout(timer);
  }, [currentComparisonIndex, evals]);

  // Navigation functions
  const goToPrevious = () => {
    setCurrentComparisonIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentComparisonIndex(prev => Math.min(evals.length - 1, prev + 1));
  };

  const goToComparison = (index: number) => {
    setCurrentComparisonIndex(Math.max(0, Math.min(evals.length - 1, index)));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (evals.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const modelIndex = parseInt(e.key) - 1;
          if (modelIndex < folderNames.length) {
            handleVote(currentComparisonIndex, modelIndex);
          }
          break;
        case 't':
          e.preventDefault();
          handleVote(currentComparisonIndex, 'tie');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentComparisonIndex, evals.length, folderNames.length]);

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
      setCurrentComparisonIndex(0);
      // Reset iframe refs
      iframeRefs.current = [];
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
  const currentEval = evals[currentComparisonIndex];

  return (
    <div className="mx-auto">
      <EvalNavigation />
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
            <div className="text-center mb-4">
              <div className="text-2xl font-semibold mb-2">
                Comparison {currentComparisonIndex + 1} of {evals.length}
              </div>
              <div className="text-lg">
                Total votes: {stats.totalVotes} | Progress: {Math.round((stats.totalVotes / evals.length) * 100)}%
              </div>
              <div className="text-sm mt-1">
                {stats.stats.map((stat, i) => (
                  <span key={i}>
                    {stat.name}: {stat.wins} ({stat.percentage}%) |{" "}
                  </span>
                ))}
                <span>
                  Ties: {stats.ties} ({stats.tiePercentage}%)
                </span>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={goToPrevious}
                disabled={currentComparisonIndex === 0}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-4 py-2 rounded"
              >
                ← Previous
              </button>
              
              <select
                value={currentComparisonIndex}
                onChange={(e) => goToComparison(parseInt(e.target.value))}
                className="bg-gray-700 text-white px-3 py-2 rounded"
              >
                {evals.map((_, index) => (
                  <option key={index} value={index}>
                    Comparison {index + 1} {outcomes[index] !== null ? '✓' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={goToNext}
                disabled={currentComparisonIndex === evals.length - 1}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-4 py-2 rounded"
              >
                Next →
              </button>
            </div>

            {/* Keyboard shortcuts help */}
            <div className="text-xs text-gray-400 mb-4">
              Use ← → arrows to navigate, number keys 1-{folderNames.length} to vote, 't' for tie
            </div>
          </>
        )}
      </div>

      {/* Single Comparison View */}
      {currentEval && (
        <div className="flex flex-col gap-y-4 mt-4 mx-auto justify-center max-w-7xl px-4">
          {/* Input Image */}
          <div className="w-full flex justify-center mb-4">
            <div className="w-1/2 max-w-md p-1 border">
              <img src={currentEval.input} alt={`Input for comparison ${currentComparisonIndex + 1}`} />
            </div>
          </div>

          {/* Side-by-side outputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentEval.outputs.map((output, outputIndex) => (
              <div
                className={`p-1 border ${
                  outcomes[currentComparisonIndex] === outputIndex
                    ? "border-green-500 border-4"
                    : "border-gray-300"
                }`}
                key={outputIndex}
              >
                <div className="relative">
                  <div className="absolute top-0 left-0 bg-black text-white px-3 py-2 z-10 font-semibold">
                    {folderNames[outputIndex]} (Press {outputIndex + 1})
                  </div>
                  <iframe
                    ref={(el) => {
                      iframeRefs.current[outputIndex] = el;
                    }}
                    srcDoc={output}
                    className="w-full h-[600px] transform scale-100"
                  ></iframe>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm z-10"
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

          {/* Voting buttons */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {folderNames.map((name, i) => (
              <button
                key={i}
                className={`px-6 py-3 rounded text-lg font-semibold ${
                  outcomes[currentComparisonIndex] === i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-black"
                }`}
                onClick={() => handleVote(currentComparisonIndex, i)}
              >
                {name} Wins ({i + 1})
              </button>
            ))}
            <button
              className={`px-6 py-3 rounded text-lg font-semibold ${
                outcomes[currentComparisonIndex] === "tie"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-black"
              }`}
              onClick={() => handleVote(currentComparisonIndex, "tie")}
            >
              Tie (T)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BestOfNEvalsPage;
