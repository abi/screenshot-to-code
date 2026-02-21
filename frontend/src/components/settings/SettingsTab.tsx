import React from "react";
import { EditorTheme, Settings } from "../../types";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import { capitalize } from "../../lib/utils";
import { IS_RUNNING_ON_CLOUD } from "../../config";
import { LuArrowLeft } from "react-icons/lu";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  onClose: () => void;
}

function SettingsTab({ settings, setSettings, onClose }: Props) {
  const handleThemeChange = (theme: EditorTheme) => {
    setSettings((s) => ({
      ...s,
      editorTheme: theme,
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <LuArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          {/* Image Generation */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Image Generation
            </h2>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
              <Label htmlFor="image-generation" className="cursor-pointer">
                <div className="font-medium text-sm">
                  DALL-E Placeholder Image Generation
                </div>
                <div className="font-light mt-1 text-xs text-gray-500 dark:text-gray-400">
                  More fun with it but if you want to save money, turn it off.
                </div>
              </Label>
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
          </section>

          {/* API Keys */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              API Keys
            </h2>
            <div className="space-y-4 rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
              <div>
                <Label htmlFor="openai-api-key">
                  <div className="font-medium text-sm">OpenAI API key</div>
                  <div className="font-light mt-1 mb-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Only stored in your browser. Never stored on servers.
                    Overrides your .env config.
                  </div>
                </Label>
                <Input
                  id="openai-api-key"
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

              {!IS_RUNNING_ON_CLOUD && (
                <div>
                  <Label htmlFor="openai-base-url">
                    <div className="font-medium text-sm">
                      OpenAI Base URL (optional)
                    </div>
                    <div className="font-light mt-1 mb-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Replace with a proxy URL if you don't want to use the
                      default.
                    </div>
                  </Label>
                  <Input
                    id="openai-base-url"
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
              )}

              <div>
                <Label htmlFor="anthropic-api-key">
                  <div className="font-medium text-sm">Anthropic API key</div>
                  <div className="font-light mt-1 mb-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Only stored in your browser. Never stored on servers.
                    Overrides your .env config.
                  </div>
                </Label>
                <Input
                  id="anthropic-api-key"
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
            </div>
          </section>

          {/* Screenshot Config */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Screenshot by URL
            </h2>
            <div className="rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
              <Label htmlFor="screenshot-one-api-key">
                <div className="font-light text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  If you want to use URLs directly instead of taking the
                  screenshot yourself, add a ScreenshotOne API key.{" "}
                  <a
                    href="https://screenshotone.com?via=screenshot-to-code"
                    className="underline"
                    target="_blank"
                  >
                    Get 100 screenshots/mo for free.
                  </a>
                </div>
              </Label>
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
          </section>

          {/* Theme */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Theme
            </h2>
            <div className="space-y-4 rounded-lg border border-gray-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="app-theme">
                  <div className="font-medium text-sm">App Theme</div>
                </Label>
                <button
                  className="flex rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
                  onClick={() => {
                    document.documentElement.classList.toggle("dark");
                    document.body.classList.toggle("dark");
                  }}
                >
                  Toggle dark mode
                </button>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="editor-theme">
                  <div className="font-medium text-sm">Code Editor Theme</div>
                  <div className="font-light mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Requires page refresh to update
                  </div>
                </Label>
                <Select
                  name="editor-theme"
                  value={settings.editorTheme}
                  onValueChange={(value) =>
                    handleThemeChange(value as EditorTheme)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    {capitalize(settings.editorTheme)}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobalt">Cobalt</SelectItem>
                    <SelectItem value="espresso">Espresso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
