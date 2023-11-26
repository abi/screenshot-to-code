import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CodeGenerationParams, CodeType } from "@/generateCode";
import { useState } from "react";
import { FaReact } from "react-icons/fa"
import CodeMirror from "./CodeMirror";
import { usePersistedState } from "@/hooks/usePersistedState";
import { AppState, EditorTheme, Settings } from "@/types";
import { doCopyCode } from "@/lib/utils";
import { Textarea } from "./ui/textarea";


interface IProps {
    doGenerateCode: (params: CodeGenerationParams, setCode: (value: React.SetStateAction<string>) => void) => void;
    referenceImage: string;
    appState: AppState;
}

export const ReactCodeEditor: React.FC<IProps> = ({ doGenerateCode, referenceImage, appState }) => {
    const [generatedReactCode, setGeneratedReactCode] = useState("");
    const [updateInstruction, setUpdateInstruction] = useState("");
    const [reactHistory, setReactHistory] = useState<string[]>([]);
    const [settings] = usePersistedState<Settings>(
        {
          openAiApiKey: null,
          screenshotOneApiKey: null,
          isImageGenerationEnabled: true,
          editorTheme: EditorTheme.COBALT,
          isTermOfServiceAccepted: false,
        },
        "setting"
      );
    async function doUpdateReact() {
        const updatedHistory = [...reactHistory, generatedReactCode, updateInstruction];
        doGenerateCode({
            generationType: "update",
            codeType: CodeType.REACT,
            image: referenceImage,
            history: updatedHistory,
        }, setGeneratedReactCode);

        setReactHistory(updatedHistory);
        setGeneratedReactCode("");
        setUpdateInstruction("");
    }

    async function init() {
        doGenerateCode({
            generationType: "create",
            codeType: CodeType.REACT,
            image: referenceImage,
            history: [],
        }, setGeneratedReactCode);
    }

    return (
    <Dialog onOpenChange={(open: boolean) => {
        if (open && generatedReactCode === "") {
            init();
        }
    }}>
        <DialogTrigger asChild>
        <Button className="flex items-center gap-x-2 ml-4"><FaReact /> Generate React Code</Button>
        </DialogTrigger>
        <DialogContent className="sm:min-w-[425px] lg:min-w-[1240px] h-[660px] flex flex-col justify-between">
            <DialogHeader>
                <DialogTitle>Generate React Code</DialogTitle>
                <DialogDescription>
                Notice: The code below may shows different results than the HTML code.
                </DialogDescription>
            </DialogHeader>
            <div className="gap-2 flex-1 overflow-scroll">
                <CodeMirror
                    editorTheme={settings.editorTheme}
                    code={generatedReactCode}
                    onCodeChange={setGeneratedReactCode}
                    doCopyCode={() => doCopyCode(generatedReactCode)}
                />
            </div>
            <Textarea
                placeholder="Tell the AI what to change..."
                onChange={(e) => setUpdateInstruction(e.target.value)}
                value={updateInstruction}
            />
            <DialogFooter>
                <Button disabled={appState === AppState.CODING} onClick={doUpdateReact}>Update</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}
