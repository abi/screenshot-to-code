import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FaCog } from "react-icons/fa";
import { EditorTheme, Settings } from "../../types";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { capitalize } from "../../lib/utils";
import { IS_RUNNING_ON_CLOUD } from "../../config";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Button } from "../ui/button";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

function SettingsDialog({ settings, setSettings }: Props) {
  const handleThemeChange = (theme: EditorTheme) => {
    setSettings((s) => ({
      ...s,
      editorTheme: theme,
    }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <FaCog className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Generation Toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Label htmlFor="image-generation" className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100">DALL-E Placeholder Images</div>
              <div className="font-normal mt-1 text-xs text-slate-500 dark:text-slate-400">
                Generate placeholder images with AI. Turn off to save costs.
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

          {/* API Keys Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                API Keys
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-slate-700 to-transparent"></div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="openai-api-key" className="text-sm font-medium">
                  OpenAI API Key
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">
                  Stored locally in your browser. Never sent to our servers.
                </p>
                <Input
                  id="openai-api-key"
                  placeholder="sk-..."
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
                  <Label htmlFor="openai-base-url" className="text-sm font-medium">
                    OpenAI Base URL (optional)
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">
                    Use a custom proxy URL instead of the default.
                  </p>
                  <Input
                    id="openai-base-url"
                    placeholder="https://api.openai.com/v1"
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
                <Label htmlFor="anthropic-api-key" className="text-sm font-medium">
                  Anthropic API Key
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">
                  Stored locally in your browser. Never sent to our servers.
                </p>
                <Input
                  id="anthropic-api-key"
                  placeholder="sk-ant-..."
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
          </div>

          {/* Advanced Settings */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="screenshot" className="border-none">
              <AccordionTrigger className="text-sm font-medium py-3 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:no-underline">
                Screenshot by URL Config
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Use URLs directly instead of uploading screenshots.{" "}
                  <a
                    href="https://screenshotone.com?via=screenshot-to-code"
                    className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2"
                    target="_blank"
                  >
                    Get 100 free screenshots/month
                  </a>
                </div>
                <Input
                  id="screenshot-one-api-key"
                  placeholder="ScreenshotOne API key"
                  value={settings.screenshotOneApiKey || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      screenshotOneApiKey: e.target.value,
                    }))
                  }
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="theme" className="border-none">
              <AccordionTrigger className="text-sm font-medium py-3 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:no-underline">
                Theme Settings
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">App Theme</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      document.querySelector("div.min-h-screen")?.classList.toggle("dark");
                      document.body.classList.toggle("dark");
                      document.querySelector('div[role="presentation"]')?.classList.toggle("dark");
                    }}
                  >
                    Toggle Dark Mode
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Code Editor Theme</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Requires page refresh
                    </p>
                  </div>
                  <Select
                    name="editor-theme"
                    value={settings.editorTheme}
                    onValueChange={(value) => handleThemeChange(value as EditorTheme)}
                  >
                    <SelectTrigger className="w-[140px]">
                      {capitalize(settings.editorTheme)}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cobalt">Cobalt</SelectItem>
                      <SelectItem value="espresso">Espresso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="default" size="sm">
              Save Changes
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
