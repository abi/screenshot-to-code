import { FaCopy } from "react-icons/fa";
import CodeMirror from "./CodeMirror";
import { Button } from "../ui/button";
import { Settings } from "../../types";
import copy from "copy-to-clipboard";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { Stack } from "../../lib/stacks";

interface Props {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  settings: Settings;
}

/** CDN links for each stack, keyed by Stack enum value. */
const STACK_CDN: Record<string, { css: string[]; js: string[] }> = {
  [Stack.HTML_TAILWIND]: {
    css: ["https://cdn.tailwindcss.com"],
    js: [],
  },
  [Stack.HTML_CSS]: {
    css: ["https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"],
    js: [],
  },
  [Stack.BOOTSTRAP]: {
    css: [
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css",
    ],
    js: ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"],
  },
  [Stack.IONIC_TAILWIND]: {
    css: [
      "https://cdn.tailwindcss.com",
      "https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css",
    ],
    js: [
      "https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js",
      "https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js",
    ],
  },
  // React and Vue cannot be expressed in a single HTML file without a bundler;
  // they are listed here so the UI is self-consistent, but CodePen will render
  // the raw JSX/Vue SFC which the browser cannot execute as-is.
  [Stack.REACT_TAILWIND]: {
    css: ["https://cdn.tailwindcss.com"],
    js: ["https://unpkg.com/react@18/umd/react.production.min.js"],
  },
  [Stack.VUE_TAILWIND]: {
    css: ["https://cdn.tailwindcss.com"],
    js: [],
  },
};

function CodeTab({ code, setCode, settings }: Props) {
  const copyCode = useCallback(() => {
    copy(code);
    toast.success("Copied to clipboard");
  }, [code]);

  const doOpenInCodepenio = useCallback(async () => {
    const stack = settings.generatedCodeConfig ?? Stack.HTML_TAILWIND;
    const cdn = STACK_CDN[stack] ?? STACK_CDN[Stack.HTML_TAILWIND];

    const cssExternal = cdn.css.join(",");
    const jsExternal = cdn.js.join(",");

    const data = {
      html: code,
      editors: "100", // 1: Open HTML, 0: Close CSS, 0: Close JS
      layout: "left",
      css_external: cssExternal,
      js_external: jsExternal,
    };

    // Create a hidden form and submit it to open the code in CodePen
    // Can't use fetch API directly because we want to open the URL in a new tab
    const input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", "data");
    input.setAttribute("value", JSON.stringify(data));

    const form = document.createElement("form");
    form.setAttribute("method", "POST");
    form.setAttribute("action", "https://codepen.io/pen/define");
    form.setAttribute("target", "_blank");
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
  }, [code, settings.generatedCodeConfig]);

  return (
    <div className="relative">
      <div className="flex justify-start items-center px-4 mb-2">
        <span
          title="Copy Code"
          className="bg-black text-white flex items-center justify-center hover:text-black hover:bg-gray-100 cursor-pointer rounded-lg text-sm p-2.5"
          onClick={copyCode}
          data-testid="copy-code"
        >
          Copy Code <FaCopy className="ml-2" />
        </span>
        <Button
          onClick={doOpenInCodepenio}
          className="bg-gray-100 text-black ml-2 py-2 px-4 border border-black rounded-md hover:bg-gray-400 focus:outline-none"
          data-testid="open-codepen"
        >
          Open in{" "}
          <img
            src="https://assets.codepen.io/t-1/codepen-logo.svg"
            alt="codepen.io"
            className="h-4 ml-1"
          />
        </Button>
      </div>
      <CodeMirror
        code={code}
        editorTheme={settings.editorTheme}
        onCodeChange={setCode}
      />
    </div>
  );
}

export default CodeTab;
