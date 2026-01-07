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
import { downloadCode } from "./download";

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

  return (
    <div className="mx-4">
      <Tabs defaultValue="desktop">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            {appState === AppState.CODE_READY && (
              <>
                <Button
                  onClick={reset}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <FaUndo className="w-3.5 h-3.5" />
                  Reset
                </Button>
                <Button
                  onClick={() => downloadCode(previewCode)}
                  variant="secondary"
                  size="sm"
                  className="gap-2 download-btn"
                >
                  <FaDownload className="w-3.5 h-3.5" />
                  Download
                </Button>
              </>
            )}
          </div>
          <TabsList>
            <TabsTrigger value="desktop" className="gap-2">
              <FaDesktop className="w-3.5 h-3.5" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-2">
              <FaMobile className="w-3.5 h-3.5" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <FaCode className="w-3.5 h-3.5" />
              Code
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="desktop">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft overflow-hidden">
            <PreviewComponent
              code={previewCode}
              device="desktop"
              doUpdate={doUpdate}
            />
          </div>
        </TabsContent>
        <TabsContent value="mobile">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft overflow-hidden">
            <PreviewComponent
              code={previewCode}
              device="mobile"
              doUpdate={doUpdate}
            />
          </div>
        </TabsContent>
        <TabsContent value="code">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-soft overflow-hidden">
            <CodeTab
              code={previewCode}
              setCode={() => {}}
              settings={settings}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PreviewPane;
