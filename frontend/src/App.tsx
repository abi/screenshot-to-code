import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import CodePreview from "./components/CodePreview";
import Preview from "./components/Preview";
import { generateCode } from "./generateCode";
import Spinner from "./components/Spinner";
import classNames from "classnames";

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
    <div className="mx-auto mt-6 max-w-[1000px]">
      <h1 className="text-4xl mb-2 text-center">Screenshot to Code</h1>
      <h1 className="text-base text-gray-500 mb-2 text-center">
        drag & drop a screenshot below
      </h1>

      {appState === "INITIAL" && (
        <>
          <ImageUpload setReferenceImages={startCodeGeneration} />
        </>
      )}

      {(appState === "CODING" || appState === "CODE_READY") && (
        <>
          <div className="flex gap-x-2 justify-around">
            <div
              className={classNames({
                "scanning relative": appState === "CODING",
              })}
            >
              <img
                className="w-[300px]"
                src={referenceImages[0]}
                alt="Reference"
              />
            </div>
            <div className="bg-gray-400 px-4 py-2 rounded text-sm hidden">
              <h2 className="text-lg mb-4 border-b border-gray-800">Console</h2>
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
          {/* Show code preview only when coding */}
          {appState === "CODING" && (
            <>
              <div className="flex items-center gap-x-1">
                <Spinner />
                {executionConsole.slice(-1)[0]}
              </div>
              <CodePreview code={generatedCode} />
            </>
          )}
          {appState === "CODE_READY" && (
            <div className="flex items-center gap-x-2 mb-4 justify-end">
              <a
                className="bg-button/70 hover:bg-highlight text-black
 py-2 px-4 rounded transition duration-300"
                onClick={createBlobUrl}
                href={blobUrl}
                download="index.html"
              >
                Download code
              </a>
              <a
                className="bg-button/70 hover:bg-highlight text-black
 py-2 px-4 rounded transition duration-300"
                onClick={createBlobUrl}
                href={blobUrl}
                download="index.html"
              >
                Reset
              </a>
            </div>
          )}
          <Preview code={generatedCode} />
        </>
      )}
    </div>
  );
}

export default App;
