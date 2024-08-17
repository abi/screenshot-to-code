import { useState } from "react";
import { HTTP_BACKEND_URL } from "../config";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "react-hot-toast";
import { useTranslation } from 'react-i18next';

interface Props {
  screenshotOneApiKey: string | null;
  doCreate: (urls: string[], inputMode: "image" | "video") => void;
}

export function UrlInputSection({ doCreate, screenshotOneApiKey }: Props) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");

  async function takeScreenshot() {
    if (!screenshotOneApiKey) {
      toast.error(t('urlInput.errorNoApiKey'), { duration: 8000 });
      return;
    }

    if (!referenceUrl) {
      toast.error(t('urlInput.errorNoUrl'));
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
          throw new Error(t('urlInput.errorCapture'));
        }

        const res = await response.json();
        doCreate([res.url], "image");
      } catch (error) {
        console.error(error);
        toast.error(t('urlInput.errorCaptureDetails'));
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="max-w-[90%] min-w-[40%] gap-y-2 flex flex-col">
      <div className="text-gray-500 text-sm">{t('urlInput.orScreenshot')}</div>
      <Input
        placeholder={t('urlInput.enterUrl')}
        onChange={(e) => setReferenceUrl(e.target.value)}
        value={referenceUrl}
      />
      <Button
        onClick={takeScreenshot}
        disabled={isLoading}
        className="bg-slate-400 capture-btn"
      >
        {isLoading ? t('urlInput.capturing') : t('urlInput.capture')}
      </Button>
    </div>
  );
}
