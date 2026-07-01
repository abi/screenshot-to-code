import React, { useEffect, useState } from "react";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";
import { AppTheme, EditorTheme, Settings } from "../../types";
import { capitalize } from "../../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { HTTP_BACKEND_URL, IS_RUNNING_ON_CLOUD } from "../../config";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  appTheme: AppTheme;
  setAppTheme: React.Dispatch<React.SetStateAction<AppTheme>>;
}

function SettingsTab({ settings, setSettings, appTheme, setAppTheme }: Props) {
  // null = not yet known (loading / unreachable); otherwise the backend's answer.
  const [screenshotPreviewAvailable, setScreenshotPreviewAvailable] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${HTTP_BACKEND_URL}/api/capabilities`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.screenshot_preview === "boolean") {
          setScreenshotPreviewAvailable(data.screenshot_preview);
        }
      })
      .catch(() => {
        /* leave as null - don't show a false alarm if the backend is unreachable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleThemeChange = (theme: EditorTheme) => {
    setSettings((s) => ({
      ...s,
      editorTheme: theme,
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>

        <div className="mx-auto max-w-lg space-y-6">
          {/* Theme */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                Theme
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-700">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    App Theme
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    System default, with optional light/dark override
                  </p>
                </div>
                <Select
                  name="app-theme"
                  value={appTheme}
                  onValueChange={(value) => setAppTheme(value as AppTheme)}
                >
                  <SelectTrigger className="w-[140px]">
                    {capitalize(appTheme)}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AppTheme.SYSTEM}>System</SelectItem>
                    <SelectItem value={AppTheme.LIGHT}>Light</SelectItem>
                    <SelectItem value={AppTheme.DARK}>Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    Code Editor Theme
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    Requires page refresh to update
                  </p>
                </div>
                <Select
                  name="editor-theme"
                  value={settings.editorTheme}
                  onValueChange={(value) =>
                    handleThemeChange(value as EditorTheme)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <span className="notranslate" translate="no">
                      {capitalize(settings.editorTheme)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobalt">
                      <span className="notranslate" translate="no">Cobalt</span>
                    </SelectItem>
                    <SelectItem value="espresso">
                      <span className="notranslate" translate="no">Espresso</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {!IS_RUNNING_ON_CLOUD && (
            <>
              {/* API Keys */}
              <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
                  <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                    API Keys
                  </h2>
                </div>
                <div className="space-y-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                      OpenAI API key
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                      Only stored in your browser. Never stored on servers. Overrides
                      your .env config.
                    </p>
                    <Input
                      id="openai-api-key"
                      className="mt-2"
                      placeholder="OpenAI API key"
                      value={settings.openAiApiKey || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          openAiApiKey: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                      OpenAI Base URL (optional)
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                      Replace with a proxy URL if you don't want to use the
                      default.
                    </p>
                    <Input
                      id="openai-base-url"
                      className="mt-2"
                      placeholder="OpenAI Base URL"
                      value={settings.openAiBaseURL || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          openAiBaseURL: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                      Anthropic API key
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                      Only stored in your browser. Never stored on servers. Overrides
                      your .env config.
                    </p>
                    <Input
                      id="anthropic-api-key"
                      className="mt-2"
                      placeholder="Anthropic API key"
                      value={settings.anthropicApiKey || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          anthropicApiKey: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                      Gemini API key
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                      Only stored in your browser. Never stored on servers. Overrides
                      your .env config.
                    </p>
                    <Input
                      id="gemini-api-key"
                      className="mt-2"
                      placeholder="Gemini API key"
                      value={settings.geminiApiKey || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          geminiApiKey: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Image Generation */}
              <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
                  <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                    Image Generation
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-zinc-300">
                        Placeholder Images
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                        More fun with it but if you want to save money, turn it off.
                      </p>
                    </div>
                    <Switch
                      id="image-generation"
                      checked={settings.isImageGenerationEnabled}
                      onCheckedChange={() =>
                        setSettings((s) => ({
                          ...s,
                          isImageGenerationEnabled: !s.isImageGenerationEnabled,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Screenshot by URL */}
              <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
                  <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                    Screenshot by URL
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    If you want to use URLs directly instead of taking the screenshot
                    yourself, add a ScreenshotOne API key.{" "}
                    <a
                      href="https://screenshotone.com?via=screenshot-to-code"
                      className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      target="_blank"
                    >
                      Get 100 screenshots/mo for free.
                    </a>
                  </p>
                  <Input
                    id="screenshot-one-api-key"
                    className="mt-3"
                    placeholder="ScreenshotOne API key"
                    value={settings.screenshotOneApiKey || ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        screenshotOneApiKey: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Screenshot Preview (agent self-verification) */}
              <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
                  <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                    Screenshot Preview
                  </h2>
                </div>
                <div className="p-4">
                  {screenshotPreviewAvailable === false ? (
                    <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-900/20">
                      <BsExclamationTriangleFill className="mt-0.5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Screenshot preview is unavailable
                        </p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          Headless Chromium isn't installed on the backend, so the
                          agent can't render and visually verify its own output.
                          Install it with{" "}
                          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">
                            playwright install chromium
                          </code>{" "}
                          and restart the backend.
                        </p>
                      </div>
                    </div>
                  ) : screenshotPreviewAvailable === true ? (
                    <div className="flex items-start gap-2.5">
                      <BsCheckCircleFill className="mt-0.5 shrink-0 text-emerald-500" />
                      <div>
                        <p className="text-sm text-gray-700 dark:text-zinc-300">
                          Available
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                          The agent renders your generated page in a headless browser
                          to visually check its work and fix layout issues.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      Checking backend capabilities...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
