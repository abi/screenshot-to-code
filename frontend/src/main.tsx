import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import AppContainer from "./components/hosted/AppContainer.tsx";
import { ClerkProvider } from "@clerk/clerk-react";
import EvalsPage from "./components/evals/EvalsPage.tsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CLERK_PUBLISHABLE_KEY } from "./config.ts";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Router>
        <Routes>
          <Route path="/" element={<AppContainer />} />
          <Route path="/evals" element={<EvalsPage />} />
        </Routes>
      </Router>
      <Toaster
        toastOptions={{ className: "dark:bg-zinc-950 dark:text-white" }}
      />
    </ClerkProvider>
  </React.StrictMode>
);
