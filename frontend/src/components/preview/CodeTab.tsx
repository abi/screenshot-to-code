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

const DARTPAD_ORIGIN = "https://dartpad.dev";
const DARTPAD_EMBED_URL =
  "https://dartpad.dev/embed-flutter.html?split=0&run=true&theme=dark";

function CodeTab({ code, setCode, settings }: Props) {
  const copyCode = useCallback(() => {
    copy(code);
    toast.success("Copied to clipboard");
  }, [code]);
  const isFlutter = settings.generatedCodeConfig === Stack.FLUTTER;

  const doOpenInCodepenio = useCallback(async () => {
    // TODO: Update CSS and JS external links depending on the framework being used
    const data = {
      html: code,
      editors: "100", // 1: Open HTML, 0: Close CSS, 0: Close JS
      layout: "left",
      css_external:
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" +
        (code.includes("<ion-")
          ? ",https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css"
          : ""),
      js_external:
        "https://cdn.tailwindcss.com " +
        (code.includes("<ion-")
          ? ",https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js,https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js"
          : ""),
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
  }, [code]);

  const doOpenInDartPad = useCallback(() => {
    const dartPadWindow = window.open(DARTPAD_EMBED_URL, "_blank");
    if (!dartPadWindow) return;
    setTimeout(() => {
      dartPadWindow.postMessage(
        {
          type: "sourceCode",
          sourceCode: code,
        },
        DARTPAD_ORIGIN
      );
      dartPadWindow.postMessage({ type: "execute" }, DARTPAD_ORIGIN);
    }, 1000);
  }, [code]);

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
        {isFlutter ? (
          <Button
            onClick={doOpenInDartPad}
            className="bg-gray-100 text-black ml-2 py-2 px-4 border border-black rounded-md hover:bg-gray-400 focus:outline-none"
            data-testid="open-dartpad"
          >
            Open in DartPad
          </Button>
        ) : (
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
        )}
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
