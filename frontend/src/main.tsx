import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import * as Sentry from "@sentry/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PairwiseEvalsPage from "./components/evals/PairwiseEvalsPage";
import RunEvalsPage from "./components/evals/RunEvalsPage.tsx";
import BestOfNEvalsPage from "./components/evals/BestOfNEvalsPage.tsx";
import AllEvalsPage from "./components/evals/AllEvalsPage.tsx";

import AppContainer from "./components/hosted/AppContainer.tsx";
import EvalsPage from "./components/evals/EvalsPage.tsx";
import { CLERK_PUBLISHABLE_KEY, SENTRY_DSN } from "./config.ts";
import "./index.css";
import PricingPage from "./components/hosted/PricingPage.tsx";
import CheckoutSuccessPage from "./components/hosted/CheckoutSuccessPage.tsx";
import FaqsPage from "./components/hosted/FaqsPage.tsx";

// Set up Sentry
Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
    }),
  ],
  // Tracing
  tracesSampleRate: 0.2,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/app"
      afterSignUpUrl="/app"
      localization={{
        footerPageLink__privacy:
          "By signing up, you accept our terms of service and consent to receiving occasional product updates via email.",
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<AppContainer />} />
          <Route path="/app" element={<AppContainer />} />
          <Route path="/evals" element={<AllEvalsPage />} />
          <Route path="/evals/single" element={<EvalsPage />} />
          <Route path="/evals/pairwise" element={<PairwiseEvalsPage />} />
          <Route path="/evals/best-of-n" element={<BestOfNEvalsPage />} />
          <Route path="/evals/run" element={<RunEvalsPage />} />

          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/faqs" element={<FaqsPage />} />
          <Route path="/checkout-success" element={<CheckoutSuccessPage />} />
        </Routes>
      </Router>
      <Toaster
        toastOptions={{ className: "dark:bg-zinc-950 dark:text-white" }}
      />
    </ClerkProvider>
  </React.StrictMode>
);
