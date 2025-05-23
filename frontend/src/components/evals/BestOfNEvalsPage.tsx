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
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  
  // UI state
  const [showResults, setShowResults] = useState(false);
  
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
            if (e.shiftKey) {
              // Shift + number = switch to model tab
              setCurrentModelIndex(modelIndex);
            } else {
              // Number = vote for model
              handleVote(currentComparisonIndex, modelIndex);
            }
          }
          break;
        case 't':
          e.preventDefault();
          handleVote(currentComparisonIndex, 'tie');
          break;
        case 'Tab':
          e.preventDefault();
          setCurrentModelIndex(prev => (prev + 1) % folderNames.length);
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
      setCurrentModelIndex(0);
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
      <div className="w-full py-3 bg-zinc-950 text-white">
        {evals.length === 0 ? (
          /* Setup Section */
          <div className="flex flex-col gap-3 max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {folderPaths.map((path, index) => (
                <div key={index} className="flex gap-1">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => updateFolderPath(index, e.target.value)}
                    placeholder="Enter folder name in Downloads"
                    className="flex-1 px-3 py-1 rounded text-black text-sm"
                  />
                  {index > 0 && (
                    <button
                      onClick={() => removeFolderInput(index)}
                      className="bg-red-500 px-2 py-1 rounded text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={addFolderInput}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Add Model
              </button>
              <button
                onClick={loadEvals}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm disabled:bg-blue-300"
              >
                {isLoading ? "Loading..." : "Start Comparison"}
              </button>
            </div>
          </div>
        ) : (
          /* Comparison Header */
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: Navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={goToPrevious}
                  disabled={currentComparisonIndex === 0}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-3 py-1 rounded text-sm"
                >
                  ← Prev
                </button>
                
                <select
                  value={currentComparisonIndex}
                  onChange={(e) => goToComparison(parseInt(e.target.value))}
                  className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                >
                  {evals.map((_, index) => (
                    <option key={index} value={index}>
                      #{index + 1} {outcomes[index] !== null ? '✓' : ''}
                    </option>
                  ))}
                </select>

                <button
                  onClick={goToNext}
                  disabled={currentComparisonIndex === evals.length - 1}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-3 py-1 rounded text-sm"
                >
                  Next →
                </button>

                <span className="text-sm text-gray-300">
                  {currentComparisonIndex + 1} of {evals.length}
                </span>
              </div>

              {/* Center: Progress and Results */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">Progress:</span>
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.round((stats.totalVotes / evals.length) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-300">
                    {Math.round((stats.totalVotes / evals.length) * 100)}%
                  </span>
                </div>
                
                <button
                  onClick={() => setShowResults(!showResults)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                >
                  Results
                  <span className={`transition-transform duration-200 ${showResults ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showResults && (
                  <div className="bg-gray-800 rounded overflow-hidden">
                    <table className="text-xs">
                      <thead>
                        <tr className="bg-gray-700">
                          <th className="px-2 py-1 text-gray-300">Model</th>
                          <th className="px-2 py-1 text-gray-300">Wins</th>
                          <th className="px-2 py-1 text-gray-300">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.stats.map((stat, i) => (
                          <tr key={i} className="border-t border-gray-600">
                            <td className="px-2 py-1 text-white">{stat.name}</td>
                            <td className="px-2 py-1 text-green-400 text-center">{stat.wins}</td>
                            <td className="px-2 py-1 text-green-400 text-center">{stat.percentage}%</td>
                          </tr>
                        ))}
                        {stats.ties > 0 && (
                          <tr className="border-t border-gray-600">
                            <td className="px-2 py-1 text-white">Ties</td>
                            <td className="px-2 py-1 text-yellow-400 text-center">{stats.ties}</td>
                            <td className="px-2 py-1 text-yellow-400 text-center">{stats.tiePercentage}%</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right: Quick help */}
              <div className="text-xs text-gray-400">
                ← → navigate | Tab switch models | 1-{folderNames.length} vote | T tie
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Comparison View */}
      {currentEval && (
        <div className="flex flex-col gap-y-4 mt-4 mx-auto justify-center max-w-none px-4">
          {/* Tabbed Interface Layout */}
          <div className="flex gap-4 w-full">
            {/* Fixed Reference Image */}
            <div className="flex-shrink-0 p-1 border border-blue-300 w-[250px]">
              <div className="relative">
                <div className="absolute top-0 left-0 bg-blue-600 text-white px-2 py-1 z-10 font-semibold text-sm">
                  Reference
                </div>
                <div className="w-full h-[600px] flex items-center justify-center bg-gray-50">
                  <img 
                    src={currentEval.input} 
                    alt={`Input for comparison ${currentComparisonIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Tabbed Model Display */}
            <div className="flex-1">
              {/* Model Tabs */}
              <div className="flex gap-2 mb-4">
                {folderNames.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentModelIndex(index)}
                    className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                      currentModelIndex === index
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {name} ({index + 1})
                  </button>
                ))}
              </div>

              {/* Current Model Output */}
              <div
                className={`p-1 border ${
                  outcomes[currentComparisonIndex] === currentModelIndex
                    ? "border-green-500 border-4"
                    : "border-gray-300"
                }`}
              >
                <div className="relative">
                  <iframe
                    ref={(el) => {
                      iframeRefs.current[currentModelIndex] = el;
                    }}
                    srcDoc={currentEval.outputs[currentModelIndex]}
                    className="w-full h-[600px]"
                  ></iframe>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm z-10"
                        onClick={() => setSelectedHtml(currentEval.outputs[currentModelIndex])}
                      >
                        Full Screen
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh]">
                      <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 z-10">
                        {folderNames[currentModelIndex]}
                      </div>
                      <iframe
                        srcDoc={selectedHtml}
                        className="w-full h-full"
                      ></iframe>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
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
