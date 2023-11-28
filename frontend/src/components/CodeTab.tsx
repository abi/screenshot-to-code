import { FaCopy } from "react-icons/fa";
import CodeMirror from "./CodeMirror";
import { ComponentLibrary, Settings } from "../types";
import copy from "copy-to-clipboard";
import { useCallback } from "react";
import toast from "react-hot-toast";
import OpenInCodepenio from "./OpenInCodepenio";

interface Props {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  settings: Settings;
}

function CodeTab({ code, setCode, settings }: Props) {
  const copyCode = useCallback(() => {
    copy(code);
    toast.success("Copied to clipboard");
  }, [code]);

  return (
    <div className="relative">
      <div className="flex justify-start items-center px-4 mb-2">
        <span
          title="Copy Code"
          className="bg-black text-white flex items-center justify-center hover:text-black hover:bg-gray-100 cursor-pointer rounded-lg text-sm p-2.5"
          onClick={copyCode}
        >
          Copy Code <FaCopy className="ml-2" />
        </span>
        <OpenInCodepenio code={code} support={settings.componentLibrary || ComponentLibrary.HTML}></OpenInCodepenio>
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
