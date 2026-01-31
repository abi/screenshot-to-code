import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import OutputSettingsSection from "../../settings/OutputSettingsSection";
import toast from "react-hot-toast";
import { Stack } from "../../../lib/stacks";

interface Props {
  importFromCode: (code: string, stack: Stack) => void;
}

function ImportTab({ importFromCode }: Props) {
  const [code, setCode] = useState("");
  const [stack, setStack] = useState<Stack | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const doImport = () => {
    if (code === "") {
      toast.error("Please paste in some code");
      return;
    }

    if (stack === undefined) {
      toast.error("Please select your stack");
      return;
    }

    importFromCode(code, stack);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      doImport();
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "text/html": [".html", ".htm"],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setIsDraggingFile(true),
    onDragLeave: () => setIsDraggingFile(false),
    onDrop: async (acceptedFiles) => {
      setIsDraggingFile(false);
      const file = acceptedFiles[0];
      if (!file) return;
      const contents = await file.text();
      setCode(contents);
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col gap-6 p-8 border border-gray-200 rounded-xl bg-gray-50/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-gray-700 font-medium">Import Existing Code</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div
              {...getRootProps({
                className: `rounded-lg ${
                  isDraggingFile ? "ring-2 ring-blue-300 ring-offset-2" : ""
                }`,
              })}
            >
              <input {...getInputProps()} />
              <Textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-48 font-mono text-sm resize-none"
                placeholder="Paste your HTML code here or drag/drop a .html file..."
                data-testid="import-input"
              />
            </div>

            <OutputSettingsSection
              stack={stack}
              setStack={(config: Stack) => setStack(config)}
              label="Stack:"
              shouldDisableUpdates={false}
            />

            <Button
              onClick={doImport}
              className="w-full"
              size="lg"
              data-testid="import-submit"
            >
              Import Code
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Press Cmd/Ctrl + Enter to import
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportTab;
