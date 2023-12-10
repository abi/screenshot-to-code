import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import OutputSettingsSection from "./OutputSettingsSection";
import { GeneratedCodeConfig } from "../types";
import toast from "react-hot-toast";

interface Props {
  importFromCode: (code: string, stack: GeneratedCodeConfig) => void;
}

function ImportCodeSection({ importFromCode }: Props) {
  const [code, setCode] = useState("");
  const [stack, setStack] = useState<GeneratedCodeConfig | undefined>(
    undefined
  );

  const doImport = () => {
    if (code === "") {
      toast.error("Please paste in some code");
      return;
    }

    if (stack === undefined) {
      toast.error("Please select your stack");
      return;
    }

    importFromCode(code, stack);
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Import from Code</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Paste in your HTML code</DialogTitle>
          <DialogDescription>
            Make sure that the code you're importing is valid HTML.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64"
        />

        <OutputSettingsSection
          generatedCodeConfig={stack}
          setGeneratedCodeConfig={(config: GeneratedCodeConfig) =>
            setStack(config)
          }
          label="Stack:"
          shouldDisableUpdates={false}
        />

        <DialogFooter>
          <Button type="submit" onClick={doImport}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportCodeSection;
