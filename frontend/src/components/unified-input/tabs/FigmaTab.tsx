import { useState } from "react";
import { HTTP_BACKEND_URL } from "../../../config";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { toast } from "react-hot-toast";
import OutputSettingsSection from "../../settings/OutputSettingsSection";
import { Stack } from "../../../lib/stacks";

interface Props {
  figmaAccessToken: string | null;
  doCreate: (
    urls: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
  ) => void;
  stack: Stack;
  setStack: (stack: Stack) => void;
}

function FigmaTab({ doCreate, figmaAccessToken, stack, setStack }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");

  async function exportFromFigma() {
    const trimmedUrl = figmaUrl.trim();

    if (!trimmedUrl) {
      toast.error("Please enter a Figma URL");
      return;
    }

    if (!/figma\.com\//i.test(trimmedUrl)) {
      toast.error(
        "Please enter a valid Figma URL (e.g. https://www.figma.com/design/...)",
      );
      return;
    }

    if (!figmaAccessToken) {
      toast.error(
        "Please add a Figma personal access token in Settings.",
        { duration: 6000 },
      );
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${HTTP_BACKEND_URL}/api/figma/export`, {
        method: "POST",
        body: JSON.stringify({
          figmaUrl: trimmedUrl,
          accessToken: figmaAccessToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.detail || "Failed to export from Figma",
        );
      }

      const res = await response.json();
      doCreate([res.url], "image");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to export from Figma. Check console for details.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-6 p-8 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 38 57"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-400 dark:text-zinc-500"
            >
              <path
                d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"
                fill="currentColor"
                opacity="0.8"
              />
              <path
                d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"
                fill="currentColor"
                opacity="0.4"
              />
              <path
                d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"
                fill="currentColor"
                opacity="0.6"
              />
              <path
                d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"
                fill="currentColor"
                opacity="0.5"
              />
              <path
                d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"
                fill="currentColor"
                opacity="0.7"
              />
            </svg>
          </div>

          <div className="text-center">
            <h3 className="text-gray-700 dark:text-zinc-200 font-medium">
              Import from Figma
            </h3>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
              Paste a Figma file or frame URL to export it as an image
            </p>
          </div>

          <div className="w-full space-y-3">
            <Input
              placeholder="https://www.figma.com/design/..."
              onChange={(e) => setFigmaUrl(e.target.value)}
              value={figmaUrl}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  exportFromFigma();
                }
              }}
              className="w-full"
              data-testid="figma-url-input"
            />
            <OutputSettingsSection stack={stack} setStack={setStack} />

            <Button
              onClick={exportFromFigma}
              disabled={isLoading}
              className="w-full"
              size="lg"
              data-testid="figma-export"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exporting...
                </span>
              ) : (
                "Import & Generate"
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-400 dark:text-zinc-500 text-center">
            Requires a Figma personal access token (set in Settings).
          </p>
        </div>
      </div>
    </div>
  );
}

export default FigmaTab;
