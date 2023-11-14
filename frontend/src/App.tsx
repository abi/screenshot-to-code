import { useState } from "react";
import ImageUpload from "./components/ImageUpload";

function App() {
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  return (
    <>
      <h1 className="text-2xl">Drag & Drop a Screenshot</h1>
      {referenceImages.length > 0 && (
        <img
          className="w-[300px]"
          src={referenceImages[0].data}
          alt="Reference"
        />
      )}

      {referenceImages.length === 0 && (
        <>
          <ImageUpload setReferenceImages={setReferenceImages} />
        </>
      )}
    </>
  );
}

export default App;
