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
import OutputSettingsSection from "./settings/OutputSettingsSection";
import toast from "react-hot-toast";
import { Stack } from "../lib/stacks";
import { useTranslation } from 'react-i18next';

interface Props {
  importFromCode: (code: string, stack: Stack) => void;
}

function ImportCodeSection({ importFromCode }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [stack, setStack] = useState<Stack | undefined>(undefined);

  const doImport = () => {
    if (code === "") {
      toast.error(t('importCode.errorEmptyCode'));
      return;
    }

    if (stack === undefined) {
      toast.error(t('importCode.errorNoStack'));
      return;
    }

    importFromCode(code, stack);
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="import-from-code-btn" variant="secondary">
          {t('importCode.buttonText')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('importCode.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('importCode.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64"
          placeholder={t('importCode.textareaPlaceholder')}
        />

        <OutputSettingsSection
          stack={stack}
          setStack={(config: Stack) => setStack(config)}
          label={t('importCode.stackLabel')}
          shouldDisableUpdates={false}
        />

        <DialogFooter>
          <Button className="import-btn" type="submit" onClick={doImport}>
            {t('importCode.importButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportCodeSection;
