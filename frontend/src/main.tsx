import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RunEvalsPage from "./components/evals/RunEvalsPage.tsx";
import BestOfNEvalsPage from "./components/evals/BestOfNEvalsPage.tsx";
import AllEvalsPage from "./components/evals/AllEvalsPage.tsx";
import OpenAIInputComparePage from "./components/evals/OpenAIInputComparePage.tsx";
import PromptReportsPage from "./components/evals/PromptReportsPage.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/evals" element={<AllEvalsPage />} />
        <Route path="/evals/best-of-n" element={<BestOfNEvalsPage />} />
        <Route path="/evals/run" element={<RunEvalsPage />} />
        <Route
          path="/evals/openai-input-compare"
          element={<OpenAIInputComparePage />}
        />
        <Route path="/evals/prompt-reports" element={<PromptReportsPage />} />
      </Routes>
    </Router>
    <Toaster toastOptions={{ className: "dark:bg-zinc-950 dark:text-white" }} />
  </React.StrictMode>
);
