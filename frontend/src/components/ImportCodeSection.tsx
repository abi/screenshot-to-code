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

interface Props {
  importFromCode: (code: string) => void;
}

function ImportCodeSection({ importFromCode }: Props) {
  const [code, setCode] = useState("");
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

        <DialogFooter>
          <Button type="submit" onClick={() => importFromCode(code)}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportCodeSection;
