import { useState } from "react";
import { HTTP_BACKEND_URL } from "../config";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "react-hot-toast";

interface Props {
  screenshotOneApiKey: string | null;
  doCreate: (urls: string[]) => void;
}

export function UrlInputSection({ doCreate, screenshotOneApiKey }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");
  const isDisabled = !screenshotOneApiKey;

  async function takeScreenshot() {
    if (!screenshotOneApiKey) {
      toast.error("Please add a Screenshot API key in the settings dialog");
      return;
    }

    if (!referenceUrl) {
      toast.error("Please enter a URL");
      return;
    }

    if (referenceUrl) {
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
        doCreate([res.url]);
      } catch (error) {
        console.error(error);
        toast.error(
          "Failed to capture screenshot. Look at the console and your backend logs for more details."
        );
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="w-[400px] gap-y-2 flex flex-col">
      <div className="text-gray-500 text-sm">Or screenshot a URL...</div>
      <Input
        placeholder="Enter URL"
        onChange={(e) => setReferenceUrl(e.target.value)}
        value={referenceUrl}
      />
      <Button onClick={takeScreenshot} disabled={isDisabled || isLoading}>
        {isLoading ? "Capturing..." : "Capture"}
      </Button>
      {isDisabled && (
        <div className="flex space-y-4 bg-slate-200 p-2 rounded text-stone-800 text-sm">
          <span>
            To screenshot a URL, add a{" "}
            <a
              href="https://screenshotone.com?via=screenshot-to-code"
              className="underline"
              target="_blank"
            >
              ScreenshotOne API key
            </a>{" "}
            in the settings dialog.
          </span>
        </div>
      )}
    </div>
  );
}
