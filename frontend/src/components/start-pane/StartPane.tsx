import React from "react";
import ImageUpload from "../ImageUpload";
import { UrlInputSection } from "../UrlInputSection";
import ImportCodeSection from "../ImportCodeSection";
import { Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import GenerateFromText from "../generate-from-text/GenerateFromText";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string
  ) => void;
  doCreateFromText: (text: string) => void;
  importFromCode: (code: string, stack: Stack) => void;
  settings: Settings;
}

const StartPane: React.FC<Props> = ({
  doCreate,
  doCreateFromText,
  importFromCode,
  settings,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-5xl px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Start from anything
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Upload a screenshot, capture a URL, describe it in text, or import
            existing code to jump straight into iteration.
          </p>
        </div>

        <Tabs defaultValue="image" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
            <TabsTrigger value="image">Image / Video</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="text">Text Prompt</TabsTrigger>
            <TabsTrigger value="import">Import Code</TabsTrigger>
          </TabsList>

          <TabsContent value="image">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-zinc-950">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Generate from an image or video
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Drop a screenshot or screen recording to recreate the UI in
                  code.
                </p>
              </div>
              <ImageUpload
                setReferenceImages={doCreate}
                dropzoneSize="compact"
              />
            </div>
          </TabsContent>

          <TabsContent value="url">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-zinc-950">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Capture a URL
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Generate from a live site by taking a snapshot first.
                </p>
              </div>
              <UrlInputSection
                doCreate={doCreate}
                screenshotOneApiKey={settings.screenshotOneApiKey}
                label="Enter a URL to capture."
              />
            </div>
          </TabsContent>

          <TabsContent value="text">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-zinc-950">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Generate from a text prompt
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Describe the UI you want, and we&apos;ll build the first
                  version.
                </p>
              </div>
              <GenerateFromText
                doCreateFromText={doCreateFromText}
                defaultOpen
                showTrigger={false}
                className="mt-0"
              />
            </div>
          </TabsContent>

          <TabsContent value="import">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-zinc-950">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Import existing code
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Paste HTML/CSS to start iterating on an existing project.
                </p>
              </div>
              <ImportCodeSection importFromCode={importFromCode} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StartPane;
