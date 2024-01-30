import { useState } from "react";
import { HTTP_BACKEND_URL } from "../config";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "react-hot-toast";
import { useStore } from "../store/store";
import { useAuth } from "@clerk/clerk-react";

interface Props {
  screenshotOneApiKey: string | null;
  doCreate: (urls: string[]) => void;
}

export function UrlInputSection({ doCreate, screenshotOneApiKey }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");

  // Hosted version only
  const subscriberTier = useStore((state) => state.subscriberTier);
  const { getToken } = useAuth();

  async function takeScreenshot() {
    if (!referenceUrl) {
      return toast.error("Please enter a URL");
    }

    if (!screenshotOneApiKey && subscriberTier === "free") {
      return toast.error(
        "Please upgrade to a paid plan to use the screenshot feature."
      );
    }

    if (referenceUrl) {
      try {
        setIsLoading(true);
        const authToken = await getToken();
        const response = await fetch(`${HTTP_BACKEND_URL}/api/screenshot`, {
          method: "POST",
          body: JSON.stringify({
            url: referenceUrl,
            apiKey: screenshotOneApiKey,
            authToken,
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
        className="bg-slate-400"
      >
        {isLoading ? "Capturing..." : "Capture"}
      </Button>
    </div>
  );
}
