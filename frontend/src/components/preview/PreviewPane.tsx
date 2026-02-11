import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import {
  FaDownload,
  FaDesktop,
  FaMobile,
  FaCode,
} from "react-icons/fa";
import { LuChevronLeft, LuChevronRight, LuExternalLink, LuImage, LuRefreshCw } from "react-icons/lu";
import { useMemo, useState } from "react";
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
  settings: Settings;
  onOpenVersions: () => void;
}

function PreviewPane({ doUpdate, settings, onOpenVersions }: Props) {
  const { appState } = useAppStore();
  const { inputMode, referenceImages, head, commits, setHead } = useProjectStore();
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);

  // Sorted commit list for version navigation
  const sortedCommits = useMemo(() =>
    Object.values(commits).sort(
      (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
    ), [commits]);

  const currentVersionIndex = sortedCommits.findIndex(c => c.hash === head);
  const totalVersions = sortedCommits.length;
  const canGoPrev = currentVersionIndex > 0;
  const canGoNext = currentVersionIndex < totalVersions - 1;

  const currentCommit = head && commits[head] ? commits[head] : "";
  const currentCode = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex].code
    : "";

  const previewCode =
    inputMode === "video" && appState === AppState.CODING
      ? extractHtml(currentCode)
      : currentCode;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Tabs defaultValue="desktop" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
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
          </div>

          {/* Version navigation */}
          {totalVersions > 0 && (
            <div className="flex items-center gap-1">
              <Button
                onClick={() => canGoPrev && setHead(sortedCommits[currentVersionIndex - 1].hash)}
                variant="ghost"
                size="icon"
                title="Previous version"
                className={`h-7 w-7 ${canGoPrev ? "" : "invisible"}`}
              >
                <LuChevronLeft className="w-4 h-4" />
              </Button>
              <button
                onClick={onOpenVersions}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-1.5 py-0.5 rounded tabular-nums"
                title="View all versions"
              >
                v{currentVersionIndex + 1}
              </button>
              <Button
                onClick={() => canGoNext && setHead(sortedCommits[currentVersionIndex + 1].hash)}
                variant="ghost"
                size="icon"
                title="Next version"
                className={`h-7 w-7 ${canGoNext ? "" : "invisible"}`}
              >
                <LuChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1">
            {appState === AppState.CODE_READY && (
              <Button
                onClick={() => downloadCode(previewCode)}
                variant="ghost"
                size="icon"
                title="Download Code"
                className="h-9 w-9"
                data-testid="download-code"
              >
                <FaDownload />
              </Button>
            )}
            <Button
              onClick={() => openInNewTab(previewCode)}
              variant="ghost"
              size="icon"
              title="Open in New Tab"
              className="h-9 w-9"
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
              className="h-9 w-9"
            >
              <LuRefreshCw />
            </Button>
          </div>
        </div>
        <TabsContent value="desktop" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <PreviewComponent
            code={previewCode}
            device="desktop"
            doUpdate={doUpdate}
          />
        </TabsContent>
        <TabsContent value="mobile" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <PreviewComponent
            code={previewCode}
            device="mobile"
            doUpdate={doUpdate}
          />
        </TabsContent>
        <TabsContent value="code" className="flex-1 min-h-0 mt-0 overflow-auto">
          <CodeTab
            code={previewCode}
            setCode={() => {}}
            settings={settings}
          />
        </TabsContent>
        {referenceImages.length > 0 && (
          <TabsContent value="reference" className="flex-1 min-h-0 mt-0 overflow-auto">
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
