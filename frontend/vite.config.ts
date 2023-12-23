import path from "path";
import { defineConfig, loadEnv } from "vite";
import checker from "vite-plugin-checker";
import react from "@vitejs/plugin-react";
import { createHtmlPlugin } from "vite-plugin-html";
import copy from 'rollup-plugin-copy';

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
            injectHead: process.env.VITE_IS_DEPLOYED
              ? '<script defer="" data-domain="screenshottocode.com" src="https://plausible.io/js/script.js"></script>'
              : "",
          },
        },
      }),
      copy({
        targets: [
          { src: 'dist/index.html', dest: path.resolve('../backend/templates/')},
          { src: 'dist/assets', dest: path.resolve('../backend/') }
        ]
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
};
