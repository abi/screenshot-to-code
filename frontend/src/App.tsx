import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import CodePreview from "./components/CodePreview";
import Preview from "./components/Preview";
import { generateCode } from "./generateCode";
import Spinner from "./components/Spinner";
import classNames from "classnames";
import { FaDownload, FaUndo } from "react-icons/fa";

function App() {
  const [appState, setAppState] = useState<"INITIAL" | "CODING" | "CODE_READY">(
    "INITIAL"
  );
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [executionConsole, setExecutionConsole] = useState<string[]>([]);
  const [blobUrl, setBlobUrl] = useState("");

  const createBlobUrl = () => {
    const blob = new Blob([generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
  };

  const reset = () => {
    setAppState("INITIAL");
    setGeneratedCode("");
    setReferenceImages([]);
    setExecutionConsole([]);
    setBlobUrl("");
  };

  function startCodeGeneration(referenceImages: string[]) {
    setAppState("CODING");
    setReferenceImages(referenceImages);
    generateCode(
      referenceImages[0],
      function (token) {
        setGeneratedCode((prev) => prev + token);
      },
      function (code) {
        setGeneratedCode(code);
      },
      function (line) {
        setExecutionConsole((prev) => [...prev, line]);
      },
      function () {
        setAppState("CODE_READY");
      }
    );
  }

  return (
    <div className="mt-6">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-96 lg:flex-col">
        <div className="flex grow flex-col gap-y-2 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <h1 className="text-2xl mt-10">Screenshot to Code</h1>
          <h2 className="text-sm text-gray-500 mb-2">
            Drag & drop a screenshot to get started.
          </h2>

          {(appState === "CODING" || appState === "CODE_READY") && (
            <>
              {/* Show code preview only when coding */}
              {appState === "CODING" && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-x-1">
                    <Spinner />
                    {executionConsole.slice(-1)[0]}
                  </div>
                  <CodePreview code={generatedCode} />
                </div>
              )}
              <div className="flex gap-x-2">
                <div
                  className={classNames({
                    "scanning relative": appState === "CODING",
                  })}
                >
                  <img
                    className="w-[340px]"
                    src={referenceImages[0]}
                    alt="Reference"
                  />
                </div>
                <div className="bg-gray-400 px-4 py-2 rounded text-sm hidden">
                  <h2 className="text-lg mb-4 border-b border-gray-800">
                    Console
                  </h2>
                  {executionConsole.map((line, index) => (
                    <div
                      key={index}
                      className="border-b border-gray-400 mb-2 text-gray-600 font-mono"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {appState === "CODE_READY" && (
                <div className="flex items-center gap-x-2 mb-4">
                  <a
                    className="bg-button/70 hover:bg-highlight text-black
 py-2 px-3 rounded transition duration-300 flex gap-x-2 items-center text-sm"
                    onClick={createBlobUrl}
                    href={blobUrl}
                    download="index.html"
                  >
                    <FaDownload /> Download
                  </a>
                  <button
                    className="bg-button/70 hover:bg-highlight text-black
 py-2 px-3 rounded transition duration-300 flex gap-x-2 items-center text-sm"
                    onClick={reset}
                  >
                    <FaUndo />
                    Reset
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <main className="py-2 lg:pl-96">
        {appState === "INITIAL" && (
          <>
            <ImageUpload setReferenceImages={startCodeGeneration} />
          </>
        )}

        {(appState === "CODING" || appState === "CODE_READY") && (
          <div className="ml-4">
            <Preview code={generatedCode} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
