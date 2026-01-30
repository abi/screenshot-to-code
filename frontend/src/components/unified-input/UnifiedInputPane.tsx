import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Stack } from "../../lib/stacks";
import { Settings } from "../../types";
import UploadTab from "./tabs/UploadTab";
import UrlTab from "./tabs/UrlTab";
import TextTab from "./tabs/TextTab";
import ImportTab from "./tabs/ImportTab";

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

type InputTab = "upload" | "url" | "text" | "import";

function UnifiedInputPane({
  doCreate,
  doCreateFromText,
  importFromCode,
  settings,
}: Props) {
  const [activeTab, setActiveTab] = useState<InputTab>("upload");

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as InputTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger
            value="upload"
            className="flex items-center gap-2"
            data-testid="tab-upload"
          >
            <UploadIcon />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger
            value="url"
            className="flex items-center gap-2"
            data-testid="tab-url"
          >
            <UrlIcon />
            <span className="hidden sm:inline">URL</span>
          </TabsTrigger>
          <TabsTrigger
            value="text"
            className="flex items-center gap-2"
            data-testid="tab-text"
          >
            <TextIcon />
            <span className="hidden sm:inline">Text</span>
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="flex items-center gap-2"
            data-testid="tab-import"
          >
            <ImportIcon />
            <span className="hidden sm:inline">Import</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <UploadTab doCreate={doCreate} />
        </TabsContent>

        <TabsContent value="url" className="mt-0">
          <UrlTab
            doCreate={doCreate}
            screenshotOneApiKey={settings.screenshotOneApiKey}
          />
        </TabsContent>

        <TabsContent value="text" className="mt-0">
          <TextTab doCreateFromText={doCreateFromText} />
        </TabsContent>

        <TabsContent value="import" className="mt-0">
          <ImportTab importFromCode={importFromCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function UrlIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 6.1H3" />
      <path d="M21 12.1H3" />
      <path d="M15.1 18H3" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export default UnifiedInputPane;
