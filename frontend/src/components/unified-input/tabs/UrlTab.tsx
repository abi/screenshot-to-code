import { useRef, useState } from "react";
import { LuGlobe2 } from "react-icons/lu";
import { HTTP_BACKEND_URL, IS_RUNNING_ON_CLOUD } from "../../../config";
import { Input } from "../../ui/input";
import { toast } from "react-hot-toast";
import { useAuth } from "@clerk/react";
import { DesignSystemSelectorProps } from "../../settings/DesignSystemSelector";
import { Stack } from "../../../lib/stacks";
import ScreenshotToCodeControls from "../ScreenshotToCodeControls";

interface Props {
  screenshotOneApiKey: string | null;
  isFreeTrialEligible?: boolean;
  doCreate: (
    urls: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
    isAssetExtractionEnabled?: boolean,
  ) => void;
  stack: Stack;
  setStack: (stack: Stack) => void;
  designSystem: DesignSystemSelectorProps;
}

function isFigmaUrl(url: string): boolean {
  return /^https?:\/\/([\w.-]*\.)?figma\.com\//i.test(url.trim());
}

function UrlTab({
  doCreate,
  screenshotOneApiKey,
  isFreeTrialEligible = false,
  stack,
  setStack,
  designSystem,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");
  const { getToken } = useAuth();
  const [textPrompt, setTextPrompt] = useState("");
  const [isAssetExtractionEnabled, setIsAssetExtractionEnabled] = useState(true);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  async function takeScreenshot() {
    const trimmedReferenceUrl = referenceUrl.trim();

    if (!IS_RUNNING_ON_CLOUD && !screenshotOneApiKey) {
      toast.error(
        "Please add a ScreenshotOne API key in Settings. You can also upload screenshots directly in the Upload tab.",
        { duration: 6000 },
      );
      return;
    }

    if (!trimmedReferenceUrl) {
      toast.error("Please enter a URL");
      return;
    }

    if (trimmedReferenceUrl.toLowerCase().startsWith("file://")) {
      toast.error(
        "file:// URLs can't be screenshot. If you're trying to import a local file, please use the Import tab.",
      );
      return;
    }

    if (isFigmaUrl(trimmedReferenceUrl)) {
      toast.error(
        "Direct Figma import is not supported. Take a screenshot of your design or export the artboards as images, then use the Upload tab.",
        { duration: 6000 },
      );
      return;
    }

    try {
      setIsLoading(true);
      const authToken = IS_RUNNING_ON_CLOUD ? await getToken() : "local";
      if (IS_RUNNING_ON_CLOUD && !authToken) {
        toast.error("Please sign in to capture a URL.");
        return;
      }
      const payload: {
        url: string;
        apiKey: string | null;
        isFreeTrial?: boolean;
      } = {
        url: trimmedReferenceUrl,
        apiKey: IS_RUNNING_ON_CLOUD ? null : screenshotOneApiKey,
        ...(isFreeTrialEligible ? { isFreeTrial: true } : {}),
      };

      const response = await fetch(`${HTTP_BACKEND_URL}/api/screenshot`, {
        method: "POST",
        body: JSON.stringify({ ...payload, authToken }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorDetail = "";
        try {
          const errorBody = await response.json();
          errorDetail = errorBody?.detail ? ` ${errorBody.detail}` : "";
        } catch (error) {
          errorDetail = "";
        }
        throw new Error(
          `Failed to capture screenshot (${response.status}).${errorDetail}`,
        );
      }

      const res = await response.json();
      doCreate(
        [res.url],
        "image",
        textPrompt,
        isAssetExtractionEnabled,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to capture screenshot. Check console and backend logs for details.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleTextKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey && !isLoading) {
      event.preventDefault();
      takeScreenshot();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
            <LuGlobe2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Screenshot from URL
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-zinc-400">
              Enter a public webpage and we’ll capture it before generating code.
            </p>
          </div>
        </div>

        <div className="space-y-2 px-4 py-4 sm:px-5">
          <label
            htmlFor="reference-url"
            className="block text-xs font-medium text-gray-600 dark:text-zinc-300"
          >
            Website URL
          </label>
          <Input
            id="reference-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com"
            onChange={(event) => setReferenceUrl(event.target.value)}
            value={referenceUrl}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isLoading) {
                event.preventDefault();
                takeScreenshot();
              }
            }}
            className="h-11 w-full"
            data-testid="url-input"
          />
          {isFigmaUrl(referenceUrl) ? (
            <p className="text-xs leading-5 text-amber-600 dark:text-amber-400">
              Direct Figma import isn’t supported. Export your artboards as
              images and use the Upload tab instead.
            </p>
          ) : !IS_RUNNING_ON_CLOUD ? (
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">
              Requires a ScreenshotOne API key in Settings.
            </p>
          ) : null}
        </div>
      </div>

      <ScreenshotToCodeControls
        textPrompt={textPrompt}
        onTextPromptChange={setTextPrompt}
        textInputRef={textInputRef}
        onTextInputKeyDown={handleTextKeyDown}
        stack={stack}
        setStack={setStack}
        designSystem={designSystem}
        showAssetExtraction
        isAssetExtractionEnabled={isAssetExtractionEnabled}
        onAssetExtractionChange={setIsAssetExtractionEnabled}
        onGenerate={takeScreenshot}
        actionLabel="Capture & Generate"
        loadingActionLabel="Capturing…"
        isActionLoading={isLoading}
        actionTestId="url-capture"
      />
    </div>
  );
}

export default UrlTab;
