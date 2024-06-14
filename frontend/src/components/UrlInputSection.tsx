import { useState } from "react";
import { HTTP_BACKEND_URL } from "../config";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "react-hot-toast";

interface Props {
  screenshotOneApiKey: string | null;
  doCreate: (urls: string[], inputMode: "image" | "video") => void;
}

export function UrlInputSection({ doCreate, screenshotOneApiKey }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");

  async function takeScreenshot() {
    if (!screenshotOneApiKey) {
      toast.error(
        "Please add a ScreenshotOne API key in the Settings dialog. This is optional - you can also drag/drop and upload images directly.",
        { duration: 8000 }
      );
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
        doCreate([res.url], "image");
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
    <div className="max-w-[90%] min-w-[40%] gap-y-2 flex flex-col">
      <div className="text-gray-500 text-sm">Or screenshot a URL...</div>
      <Input
        placeholder="Enter URL"
        onChange={(e) => setReferenceUrl(e.target.value)}
        value={referenceUrl}
      />
      <Button
        onClick={takeScreenshot}
        disabled={isLoading}
        className="bg-slate-400 capture-btn"
      >
        {isLoading ? "Capturing..." : "Capture"}
      </Button>
    </div>
  );
}
