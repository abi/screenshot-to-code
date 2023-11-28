import path from "path";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import react from "@vitejs/plugin-react";
import { createHtmlPlugin } from "vite-plugin-html";

// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return defineConfig({
    base: "",
    plugins: [
      react(),
      checker({ typescript: true }),
      createHtmlPlugin({
        inject: {
          data: {
            injectHead: process.env.VITE_INJECT_HEAD,
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
