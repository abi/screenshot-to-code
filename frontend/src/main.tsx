import React from "react";
import ReactDOM from "react-dom/client";
import ImageUpload from "./components/ImageUpload.tsx";
import "./index.css";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
import { useState } from 'react';
import './App.css';

function App() {
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  return (
    <div className="App">
      <header className="App-header">
        <ImageUpload setReferenceImages={setReferenceImages} />
      </header>
    </div>
  );
}

export default App;
