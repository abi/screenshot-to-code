import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import CodePreview from "./components/CodePreview";
import Preview from "./components/Preview";
import { generateCode } from "./generateCode";

function App() {
  const [appState, setAppState] = useState<"INITIAL" | "CODING" | "CODE_READY">(
    "INITIAL"
  );
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
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
      function () {
        setAppState("CODE_READY");
      }
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-[1000px]">
      <h1 className="text-2xl mb-4">Drag & Drop a Screenshot</h1>

      {appState === "INITIAL" && (
        <>
          <ImageUpload setReferenceImages={startCodeGeneration} />
        </>
      )}

      {(appState === "CODING" || appState === "CODE_READY") && (
        <>
          <img className="w-[300px]" src={referenceImages[0]} alt="Reference" />
          {/* Show code preview only when coding */}
          {appState === "CODING" && <CodePreview code={generatedCode} />}
          {appState === "CODE_READY" && (
            <a onClick={createBlobUrl} href={blobUrl} download="index.html">
              Download code
            </a>
          )}
          <Preview code={generatedCode} />
        </>
      )}
    </div>
  );
}

export default App;
