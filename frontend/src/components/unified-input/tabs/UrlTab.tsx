import { useState } from "react";
import { HTTP_BACKEND_URL } from "../../../config";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { toast } from "react-hot-toast";

interface Props {
  screenshotOneApiKey: string | null;
  doCreate: (
    urls: string[],
    inputMode: "image" | "video",
    textPrompt?: string
  ) => void;
}

function UrlTab({ doCreate, screenshotOneApiKey }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");

  async function takeScreenshot() {
    if (!screenshotOneApiKey) {
      toast.error(
        "Please add a ScreenshotOne API key in Settings. You can also upload screenshots directly in the Upload tab.",
        { duration: 6000 }
      );
      return;
    }

    if (!referenceUrl) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${HTTP_BACKEND_URL}/api/screenshot`, {
        method: "POST",
        body: JSON.stringify({
          url: referenceUrl,
          apiKey: screenshotOneApiKey,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to capture screenshot");
      }

      const res = await response.json();
      doCreate([res.url], "image");
    } catch (error) {
      console.error(error);
      toast.error("Failed to capture screenshot. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-6 p-8 border border-gray-200 rounded-xl bg-gray-50/50">
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
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>

          <div className="text-center">
            <h3 className="text-gray-700 font-medium">Screenshot from URL</h3>
          </div>

          <div className="w-full space-y-3">
            <Input
              placeholder="https://"
              onChange={(e) => setReferenceUrl(e.target.value)}
              value={referenceUrl}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  takeScreenshot();
                }
              }}
              className="w-full"
              data-testid="url-input"
            />
            <Button
              onClick={takeScreenshot}
              disabled={isLoading}
              className="w-full"
              size="lg"
              data-testid="url-capture"
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
                  Capturing...
                </span>
              ) : (
                "Capture & Generate"
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Requires ScreenshotOne API key.
          </p>
        </div>
      </div>
    </div>
  );
}

export default UrlTab;
