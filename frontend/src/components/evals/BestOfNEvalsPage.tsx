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

interface OutputFolder {
  name: string;
  path: string;
  modified_time: number;
}

function BestOfNEvalsPage() {
  const [evals, setEvals] = React.useState<Eval[]>([]);
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  const [folderNames, setFolderNames] = useState<string[]>([]);
  // Track multiple folder paths
  const [folderPaths, setFolderPaths] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHtml, setSelectedHtml] = useState<string>("");

  // Available folders from backend
  const [availableFolders, setAvailableFolders] = useState<OutputFolder[]>([]);

  // Navigation state
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  const [currentModelIndex, setCurrentModelIndex] = useState(0);

  // UI state
  const [showResults, setShowResults] = useState(false);
  const [winnerFilter, setWinnerFilter] = useState<number | "tie" | "all">(
    "all"
  );

  // Refs for synchronized scrolling
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  // Fetch available folders on mount
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await fetch(`${HTTP_BACKEND_URL}/output_folders`);
        const folders: OutputFolder[] = await response.json();
        setAvailableFolders(folders);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };
    fetchFolders();
  }, []);

  // Synchronized scrolling effect
  useEffect(() => {
    const setupSyncScrolling = () => {
      const iframes = iframeRefs.current.filter(Boolean);
      if (iframes.length < 2) return;

      const syncScroll = (sourceIframe: HTMLIFrameElement) => {
        try {
          const sourceDocument =
            sourceIframe.contentDocument ||
            sourceIframe.contentWindow?.document;
          if (!sourceDocument) return;

          const syncHandler = () => {
            const scrollTop =
              sourceDocument.documentElement.scrollTop ||
              sourceDocument.body.scrollTop;
            const scrollLeft =
              sourceDocument.documentElement.scrollLeft ||
              sourceDocument.body.scrollLeft;

            iframes.forEach((iframe) => {
              if (!iframe || iframe === sourceIframe) return;
              try {
                const targetDocument =
                  iframe.contentDocument || iframe.contentWindow?.document;
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

          sourceDocument.addEventListener("scroll", syncHandler);
          return () =>
            sourceDocument.removeEventListener("scroll", syncHandler);
        } catch (e) {
          // Ignore cross-origin errors
        }
      };

      const cleanupFunctions = iframes
        .map((iframe) => (iframe ? syncScroll(iframe) : null))
        .filter(Boolean);
      return () => cleanupFunctions.forEach((cleanup) => cleanup?.());
    };

    // Wait for iframes to load
    const timer = setTimeout(setupSyncScrolling, 1000);
    return () => clearTimeout(timer);
  }, [currentComparisonIndex, evals]);

  // Get filtered comparisons indices
  const getFilteredIndices = () => {
    if (winnerFilter === "all") {
      return evals.map((_, index) => index);
    }
    return evals
      .map((_, index) => index)
      .filter((index) => {
        const outcome = outcomes[index];
        if (winnerFilter === "tie") {
          return outcome === "tie";
        }
        return outcome === winnerFilter;
      });
  };

  const filteredIndices = getFilteredIndices();

  // Navigation functions
  const goToPrevious = () => {
    if (winnerFilter === "all") {
      setCurrentComparisonIndex((prev) => Math.max(0, prev - 1));
    } else {
      const currentFilteredIndex = filteredIndices.indexOf(
        currentComparisonIndex
      );
      if (currentFilteredIndex > 0) {
        setCurrentComparisonIndex(filteredIndices[currentFilteredIndex - 1]);
      }
    }
  };

  const goToNext = () => {
    if (winnerFilter === "all") {
      setCurrentComparisonIndex((prev) => Math.min(evals.length - 1, prev + 1));
    } else {
      const currentFilteredIndex = filteredIndices.indexOf(
        currentComparisonIndex
      );
      if (currentFilteredIndex < filteredIndices.length - 1) {
        setCurrentComparisonIndex(filteredIndices[currentFilteredIndex + 1]);
      }
    }
  };

  const goToComparison = (index: number) => {
    setCurrentComparisonIndex(Math.max(0, Math.min(evals.length - 1, index)));
  };

  // Update current index when filter changes
  useEffect(() => {
    if (
      winnerFilter !== "all" &&
      filteredIndices.length > 0 &&
      !filteredIndices.includes(currentComparisonIndex)
    ) {
      setCurrentComparisonIndex(filteredIndices[0]);
    }
  }, [winnerFilter, filteredIndices, currentComparisonIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (evals.length === 0) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setCurrentModelIndex((prev) =>
            prev > 0 ? prev - 1 : folderNames.length - 1
          );
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentModelIndex((prev) => (prev + 1) % folderNames.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowDown":
          e.preventDefault();
          goToNext();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
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
        case "t":
          e.preventDefault();
          handleVote(currentComparisonIndex, "tie");
          break;
        case "Tab":
          e.preventDefault();
          setCurrentModelIndex((prev) => (prev + 1) % folderNames.length);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
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
      alert("Please select all folder paths");
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      folderPaths.forEach((path, index) => {
        queryParams.append(`folder${index + 1}`, path);
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

  // Copy results as CSV to clipboard
  const copyResultsAsCSV = async () => {
    const rows: string[] = [];

    // Add summary statistics only
    stats.stats.forEach((stat) => {
      rows.push(`${stat.name}\t${stat.wins}\t${stat.percentage}%`);
    });
    if (stats.ties > 0) {
      rows.push(`Ties\t${stats.ties}\t${stats.tiePercentage}%`);
    }

    const csvContent = rows.join("\n");

    try {
      await navigator.clipboard.writeText(csvContent);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = csvContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="mx-auto">
      <EvalNavigation />
      <div className="w-full py-2 bg-gradient-to-b from-gray-900 to-gray-800 text-white border-b border-gray-700">
        {evals.length === 0 ? (
          /* Setup Section */
          <div className="flex flex-col gap-4 max-w-5xl mx-auto px-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-200">
                Configure Model Comparison
              </h2>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `${HTTP_BACKEND_URL}/output_folders`
                    );
                    const folders: OutputFolder[] = await response.json();
                    setAvailableFolders(folders);
                  } catch (error) {
                    console.error("Error fetching folders:", error);
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
                title="Refresh folder list"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {folderPaths.map((path, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 font-medium w-16">
                      Model {index + 1}
                    </span>
                    <div className="flex-1 relative">
                      <select
                        value={path}
                        onChange={(e) =>
                          updateFolderPath(index, e.target.value)
                        }
                        className="w-full px-4 py-3 pr-10 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Select a folder...</option>
                        {availableFolders.map((folder) => (
                          <option
                            key={folder.path}
                            value={folder.path}
                            title={folder.name}
                          >
                            {folder.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => removeFolderInput(index)}
                        className="bg-red-500 hover:bg-red-600 px-3 py-3 rounded-lg transition-colors"
                        title="Remove model"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={addFolderInput}
                className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Model
              </button>
              <button
                onClick={loadEvals}
                disabled={isLoading || folderPaths.some((p) => !p)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Start Comparison
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Comparison Header */
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEvals([]);
                    setOutcomes([]);
                    setFolderNames([]);
                    setCurrentComparisonIndex(0);
                    setCurrentModelIndex(0);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 rounded-lg text-sm transition-colors"
                  title="Back to setup"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>

                <div className="flex items-center bg-gray-700 rounded-lg">
                  <button
                    onClick={goToPrevious}
                    disabled={currentComparisonIndex === 0}
                    className="px-2.5 py-1 rounded-l-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous comparison (↑)"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <select
                    value={currentComparisonIndex}
                    onChange={(e) => goToComparison(parseInt(e.target.value))}
                    className="bg-transparent text-white px-3 py-1 text-sm font-medium focus:outline-none appearance-none cursor-pointer"
                  >
                    {winnerFilter === "all"
                      ? evals.map((_, index) => (
                          <option
                            key={index}
                            value={index}
                            className="bg-gray-800"
                          >
                            Comparison {index + 1}{" "}
                            {outcomes[index] !== null ? "✓" : ""}
                          </option>
                        ))
                      : filteredIndices.map((index) => (
                          <option
                            key={index}
                            value={index}
                            className="bg-gray-800"
                          >
                            Comparison {index + 1}{" "}
                            {outcomes[index] !== null ? "✓" : ""}
                          </option>
                        ))}
                  </select>

                  <button
                    onClick={goToNext}
                    disabled={currentComparisonIndex === evals.length - 1}
                    className="px-2.5 py-1 rounded-r-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next comparison (↓)"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                <span className="text-sm text-gray-400 font-medium">
                  {winnerFilter === "all"
                    ? `${currentComparisonIndex + 1} of ${evals.length}`
                    : `${
                        filteredIndices.indexOf(currentComparisonIndex) + 1
                      } of ${filteredIndices.length} (filtered)`}
                </span>
              </div>

              {/* Center: Progress and Results */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-1 rounded-lg">
                  <span className="text-xs text-gray-400 font-medium">
                    Progress
                  </span>
                  <div className="w-24 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.round(
                          (stats.totalVotes / evals.length) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-200">
                    {Math.round((stats.totalVotes / evals.length) * 100)}%
                  </span>
                </div>

                <button
                  onClick={() => setShowResults(!showResults)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Results
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${
                      showResults ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Filter Dropdown */}
                <select
                  value={winnerFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "all" || value === "tie") {
                      setWinnerFilter(value);
                    } else {
                      setWinnerFilter(parseInt(value));
                    }
                  }}
                  className="px-2 py-1 bg-gray-700 text-white text-xs rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Comparisons</option>
                  {folderNames.map((name, index) => (
                    <option key={index} value={index}>
                      {name} Wins
                    </option>
                  ))}
                  <option value="tie">Ties</option>
                </select>

                {showResults && (
                  <div className="bg-gray-800 rounded overflow-hidden">
                    <div className="flex items-center justify-between px-2 py-1 bg-gray-700">
                      <span className="text-xs text-gray-300 font-semibold">
                        Results
                      </span>
                      <button
                        onClick={copyResultsAsCSV}
                        className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        Copy CSV
                      </button>
                    </div>
                    <table className="text-xs w-full">
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
                            <td className="px-2 py-1 text-white">
                              {stat.name}
                            </td>
                            <td className="px-2 py-1 text-green-400 text-center">
                              {stat.wins}
                            </td>
                            <td className="px-2 py-1 text-green-400 text-center">
                              {stat.percentage}%
                            </td>
                          </tr>
                        ))}
                        {stats.ties > 0 && (
                          <tr className="border-t border-gray-600">
                            <td className="px-2 py-1 text-white">Ties</td>
                            <td className="px-2 py-1 text-yellow-400 text-center">
                              {stats.ties}
                            </td>
                            <td className="px-2 py-1 text-yellow-400 text-center">
                              {stats.tiePercentage}%
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right: Quick help */}
              <div className="text-xs text-gray-400">
                ↑↓ nav | ←→ switch | 1-{folderNames.length} vote | T tie
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Comparison View */}
      {currentEval && (
        <div className="bg-gray-50 min-h-screen">
          <div className="flex gap-4 p-3 max-w-full">
            {/* Fixed Reference Image */}
            <div className="flex-shrink-0 w-[380px]">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-100 text-gray-700 px-3 py-1.5 border-b border-gray-200">
                  <h3 className="font-medium text-xs flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Reference Image
                  </h3>
                </div>
                <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50 p-2">
                  <img
                    src={currentEval.input}
                    alt={`Input for comparison ${currentComparisonIndex + 1}`}
                    className="max-w-full max-h-full object-contain rounded shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tabbed Model Display */}
            <div className="flex-1">
              {/* Compact Model Tabs with Inline Voting */}
              <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
                <div className="flex items-center">
                  {folderNames.map((name, index) => (
                    <div key={index} className="flex-1 flex items-center">
                      <button
                        onClick={() => setCurrentModelIndex(index)}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-all border-r border-gray-200 ${
                          currentModelIndex === index
                            ? "bg-blue-50 text-blue-700 border-b-2 border-b-blue-500"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {name}{" "}
                        <span className="text-xs opacity-60">
                          ({index + 1})
                        </span>
                      </button>
                      <button
                        onClick={() =>
                          handleVote(currentComparisonIndex, index)
                        }
                        className={`px-3 py-2 text-xs font-medium transition-all border-r border-gray-200 ${
                          outcomes[currentComparisonIndex] === index
                            ? "bg-green-100 text-green-700"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {outcomes[currentComparisonIndex] === index
                          ? "✓"
                          : "Vote"}
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleVote(currentComparisonIndex, "tie")}
                    className={`px-4 py-2 text-xs font-medium transition-all ${
                      outcomes[currentComparisonIndex] === "tie"
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {outcomes[currentComparisonIndex] === "tie"
                      ? "Tie ✓"
                      : "Tie (T)"}
                  </button>
                </div>
              </div>

              {/* Current Model Output */}
              <div className="bg-white shadow-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">
                    {folderNames[currentModelIndex]} Output
                    {outcomes[currentComparisonIndex] === currentModelIndex && (
                      <span className="ml-2 text-green-600">✓ Winner</span>
                    )}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        className="flex items-center gap-1 bg-gray-700 hover:bg-gray-800 text-white px-2 py-0.5 rounded text-xs transition-colors"
                        onClick={() =>
                          setSelectedHtml(
                            currentEval.outputs[currentModelIndex]
                          )
                        }
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                          />
                        </svg>
                        Full Screen
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] bg-gray-900">
                      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg z-10">
                        <span className="font-semibold">
                          {folderNames[currentModelIndex]}
                        </span>
                      </div>
                      <iframe
                        srcDoc={selectedHtml}
                        className="w-full h-full rounded-lg"
                      ></iframe>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="relative bg-gray-50">
                  <iframe
                    ref={(el) => {
                      iframeRefs.current[currentModelIndex] = el;
                    }}
                    srcDoc={currentEval.outputs[currentModelIndex]}
                    className="w-full h-[calc(100vh-200px)]"
                    style={{ colorScheme: "light" }}
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BestOfNEvalsPage;
