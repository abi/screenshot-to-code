import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import AppContainer from "./components/hosted/AppContainer.tsx";
import { ClerkProvider } from "@clerk/clerk-react";
import EvalsPage from "./components/evals/EvalsPage.tsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CLERK_PUBLISHABLE_KEY } from "./config.ts";
import "./index.css";
import PricingPage from "./components/hosted/PricingPage.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      localization={{
        footerPageLink__privacy:
          "By signing up, you accept our terms of service and consent to receiving occasional product updates via email.",
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<AppContainer />} />
          <Route path="/evals" element={<EvalsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </Router>
      <Toaster
        toastOptions={{ className: "dark:bg-zinc-950 dark:text-white" }}
      />
    </ClerkProvider>
  </React.StrictMode>
);
