import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FaCog } from "react-icons/fa";
import { Settings } from "../types";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

function SettingsDialog({ settings, setSettings }: Props) {
  return (
    <Dialog>
      <DialogTrigger>
        <FaCog />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-4">Settings</DialogTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="image-generation">Image Generation</Label>
            <Switch
              id="image-generation"
              checked={settings.isImageGenerationEnabled}
              onCheckedChange={() =>
                setSettings((s) => ({
                  ...s,
                  isImageGenerationEnabled: !s.isImageGenerationEnabled,
                }))
              }
            />
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
