import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import AppContainer from "./components/hosted/AppContainer.tsx";
import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY } from "./config.ts";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AppContainer />
      <Toaster
        toastOptions={{ className: "dark:bg-zinc-950 dark:text-white" }}
      />
    </ClerkProvider>
  </React.StrictMode>
);
