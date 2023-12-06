import { Settings } from "../../types";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

function AccessCodeSection({ settings, setSettings }: Props) {
  return (
    <div className="flex flex-col space-y-4 bg-slate-200 p-4 rounded dark:text-white dark:bg-slate-800">
      <Label htmlFor="access-code">
        <div>Access Code</div>
        <div className="font-light mt-1 leading-relaxed">
          Buy an access code.
        </div>
      </Label>

      <Input
        id="access-code"
        className="border-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        placeholder="Enter your Screenshot to Code access code"
        value={settings.accessCode || ""}
        onChange={(e) =>
          setSettings((s) => ({
            ...s,
            accessCode: e.target.value,
          }))
        }
      />
    </div>
  );
}

export default AccessCodeSection;
