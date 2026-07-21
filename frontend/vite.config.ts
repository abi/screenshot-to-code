import path from "path";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import react from "@vitejs/plugin-react";
import { createHtmlPlugin } from "vite-plugin-html";

// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const CODEGEN_BACKEND =
    process.env.PROXY_CODEGEN_BACKEND || "http://127.0.0.1:7001";

  return defineConfig({
    base: "",
    server: {
      // Listen on all interfaces so sandbox preview tunnels can reach the
      // dev server (default binding is loopback-only).
      host: true,
      // Route backend traffic through the frontend origin so the app works
      // via tunnels/preview URLs (no hardcoded localhost from the browser).
      proxy: {
        "/generate-code": { target: CODEGEN_BACKEND, ws: true },
        "/api": { target: CODEGEN_BACKEND },
        "/local-assets": { target: CODEGEN_BACKEND },
        // Eval pages also use same-origin requests so they work through local
        // dev servers and remote preview tunnels.
        "/eval_input_files": { target: CODEGEN_BACKEND },
        "/models": { target: CODEGEN_BACKEND },
        "/run_evals": { target: CODEGEN_BACKEND },
        "/run_evals_stream": { target: CODEGEN_BACKEND },
        "/best-of-n-evals": { target: CODEGEN_BACKEND },
        "/output_folders": { target: CODEGEN_BACKEND },
        "/openai-input-compare": { target: CODEGEN_BACKEND },
        "/prompt-reports": { target: CODEGEN_BACKEND },
      },
    },
    plugins: [
      react(),
      checker({ 
        typescript: true
      }),
      createHtmlPlugin({
        inject: {
          data: {
            injectHead: process.env.VITE_IS_DEPLOYED
              ? '<script defer="" data-domain="screenshottocode.com" src="https://plausible.io/js/script.js"></script>'
              : "",
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
};
