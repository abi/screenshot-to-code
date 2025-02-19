import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import {
  FaUndo,
  FaDownload,
  FaDesktop,
  FaMobile,
  FaCode,
} from "react-icons/fa";
import { AppState, Settings } from "../../types";
import CodeTab from "./CodeTab";
import { Button } from "../ui/button";
import { useAppStore } from "../../store/app-store";
import { useProjectStore } from "../../store/project-store";
import { extractHtml } from "./extractHtml";
import PreviewComponent from "./PreviewComponent";
import CodeViewer2 from "@/components/preview/code-viewer2";
import { downloadCode } from "./download";
import { Stack } from "../../lib/stacks";

interface Props {
  doUpdate: (instruction: string) => void;
  reset: () => void;
  settings: Settings;
}

function PreviewPane({ doUpdate, reset, settings }: Props) {
  const { appState } = useAppStore();
  const { inputMode, head, commits } = useProjectStore();

  const currentCommit = head && commits[head] ? commits[head] : "";
  const currentCode = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex].code
    : "";

  const previewCode =
    inputMode === "video" && appState === AppState.CODING
      ? extractHtml(currentCode)
      : currentCode;

  // Determine whether to use CodeViewer or PreviewComponent
  const ShouldUseCodeViewer = settings.generatedCodeConfig === Stack.REACT_SHADCN;

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
                >
                  <FaDownload /> Download
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="desktop" className="flex gap-x-2">
                <FaDesktop /> Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex gap-x-2">
                <FaMobile /> Mobile
              </TabsTrigger>
              <TabsTrigger value="code" className="flex gap-x-2">
                <FaCode />
                Code
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      
        <TabsContent value="desktop">
          {ShouldUseCodeViewer ? (
            <CodeViewer2
              code={previewCode}
              //device="desktop"
              //doUpdate={doUpdate}
            />
          ) : (
            <PreviewComponent
              code={previewCode}
              device="desktop"
              doUpdate={doUpdate}
            />
          )}
        </TabsContent>
        <TabsContent value="mobile">
          {ShouldUseCodeViewer ? (
            <CodeViewer2
              code={previewCode}
              //device="mobile"
              //doUpdate={doUpdate}
            />
          ) : (
            <PreviewComponent
              code={previewCode}
              device="mobile"
              doUpdate={doUpdate}
            />
          )}
        </TabsContent>
        <TabsContent value="code">
          <CodeTab code={previewCode} setCode={() => {}} settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PreviewPane;
