import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import CodePreview from "./components/CodePreview";
import Preview from "./components/Preview";
import { generateCode } from "./generateCode";

function App() {
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  function startCodeGeneration(referenceImages: string[]) {
    setReferenceImages(referenceImages);
    generateCode(referenceImages[0], function (token) {
      setGeneratedCode((prev) => prev + token);
    });
  }

  return (
    <div className="mx-auto mt-10 max-w-[1000px]">
      <h1 className="text-2xl mb-4">Drag & Drop a Screenshot</h1>
      {referenceImages.length > 0 && (
        <img className="w-[300px]" src={referenceImages[0]} alt="Reference" />
      )}

      {referenceImages.length === 0 && (
        <>
          <ImageUpload setReferenceImages={startCodeGeneration} />
        </>
      )}

      <CodePreview code={generatedCode} />
      <Preview code={generatedCode} />
    </div>
  );
}

export default App;
