import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import {
  FaUndo,
  FaDownload,
  FaDesktop,
  FaMobile,
  FaCode,
} from "react-icons/fa";
import { LuExternalLink, LuImage, LuRefreshCw } from "react-icons/lu";
import { useState } from "react";
import { AppState, Settings } from "../../types";
import CodeTab from "./CodeTab";
import { Button } from "../ui/button";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { extractHtml } from "./extractHtml";
import PreviewComponent from "./PreviewComponent";
import { downloadCode } from "./download";

function openInNewTab(code: string) {
  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.open();
    newWindow.document.write(code);
    newWindow.document.close();
  }
}

interface Props {
  doUpdate: (instruction: string) => void;
  reset: () => void;
  settings: Settings;
}

function PreviewPane({ doUpdate, reset, settings }: Props) {
  const { appState } = useAppStore();
  const { inputMode, referenceImages, head, commits } = useProjectStore();
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);

  const currentCommit = head && commits[head] ? commits[head] : "";
  const currentCode = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex].code
    : "";

  const previewCode =
    inputMode === "video" && appState === AppState.CODING
      ? extractHtml(currentCode)
      : currentCode;

  return (
    <div className="ml-4">
      <Tabs defaultValue="desktop">
        <div className="flex justify-between mr-8 mb-4">
          <div className="flex items-center gap-x-2">
            {appState === AppState.CODE_READY && (
              <>
                <Button
                  onClick={reset}
                  className="flex items-center ml-4 gap-x-2 dark:text-white dark:bg-gray-700"
                >
                  <FaUndo />
                  Reset
                </Button>
                <Button
                  onClick={() => downloadCode(previewCode)}
                  variant="secondary"
                  className="flex items-center gap-x-2 mr-4 dark:text-white dark:bg-gray-700 download-btn"
                  data-testid="download-code"
                >
                  <FaDownload /> Download Code
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="desktop" title="Desktop" data-testid="tab-desktop">
                <FaDesktop />
              </TabsTrigger>
              <TabsTrigger value="mobile" title="Mobile" data-testid="tab-mobile">
                <FaMobile />
              </TabsTrigger>
              <TabsTrigger value="code" title="Code" data-testid="tab-code">
                <FaCode />
              </TabsTrigger>
              {referenceImages.length > 0 && (
                <TabsTrigger value="reference" title="Reference Image">
                  <LuImage />
                </TabsTrigger>
              )}
            </TabsList>
            <Button
              onClick={() => openInNewTab(previewCode)}
              variant="ghost"
              size="icon"
              title="Open in New Tab"
            >
              <LuExternalLink />
            </Button>
            <Button
              onClick={() => {
                const iframes = document.querySelectorAll("iframe");
                iframes.forEach((iframe) => {
                  if (iframe.srcdoc) {
                    const content = iframe.srcdoc;
                    iframe.srcdoc = "";
                    iframe.srcdoc = content;
                  }
                });
              }}
              variant="ghost"
              size="icon"
              title="Refresh Preview"
            >
              <LuRefreshCw />
            </Button>
          </div>
        </div>
        <TabsContent value="desktop">
          <PreviewComponent
            code={previewCode}
            device="desktop"
            doUpdate={doUpdate}
          />
        </TabsContent>
        <TabsContent value="mobile">
          <PreviewComponent
            code={previewCode}
            device="mobile"
            doUpdate={doUpdate}
          />
        </TabsContent>
        <TabsContent value="code">
          <CodeTab
            code={previewCode}
            setCode={() => {}}
            settings={settings}
          />
        </TabsContent>
        {referenceImages.length > 0 && (
          <TabsContent value="reference">
            <div className="flex flex-col items-center gap-4 p-4">
              {inputMode === "video" ? (
                <video
                  muted
                  autoPlay
                  loop
                  className="max-w-full max-h-[80vh] rounded-lg border border-gray-200 dark:border-zinc-700"
                  src={referenceImages[0]}
                />
              ) : (
                <>
                  <img
                    className="max-w-full max-h-[80vh] object-contain rounded-lg border border-gray-200 dark:border-zinc-700"
                    src={referenceImages[activeReferenceIndex] || referenceImages[0]}
                    alt={`Reference ${activeReferenceIndex + 1}`}
                  />
                  {referenceImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {referenceImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveReferenceIndex(index)}
                          className={`h-12 w-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors ${
                            activeReferenceIndex === index
                              ? "border-blue-500"
                              : "border-transparent hover:border-gray-300 dark:hover:border-zinc-600"
                          }`}
                        >
                          <img
                            className="h-full w-full object-cover"
                            src={image}
                            alt={`Reference thumbnail ${index + 1}`}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default PreviewPane;
