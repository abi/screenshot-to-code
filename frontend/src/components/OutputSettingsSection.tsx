import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { CSSOption, JSFrameworkOption, OutputSettings } from "../types";
import toast from "react-hot-toast";
import { Label } from "@radix-ui/react-label";
import { Button } from "./ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

function displayCSSOption(option: CSSOption) {
  switch (option) {
    case CSSOption.TAILWIND:
      return "Tailwind";
    case CSSOption.BOOTSTRAP:
      return "Bootstrap";
    default:
      return option;
  }
}

function displayJSOption(option: JSFrameworkOption) {
  switch (option) {
    case JSFrameworkOption.REACT:
      return "React";
    case JSFrameworkOption.NO_FRAMEWORK:
      return "No Framework";
    default:
      return option;
  }
}

function convertStringToCSSOption(option: string) {
  switch (option) {
    case "tailwind":
      return CSSOption.TAILWIND;
    case "bootstrap":
      return CSSOption.BOOTSTRAP;
    default:
      throw new Error(`Unknown CSS option: ${option}`);
  }
}

function generateDisplayString(settings: OutputSettings) {
  if (
    settings.js === JSFrameworkOption.REACT &&
    settings.css === CSSOption.TAILWIND
  ) {
    return (
      <div>
        Generating <span className="font-bold">React</span> +{" "}
        <span className="font-bold">Tailwind</span> code
      </div>
    );
  } else if (
    settings.js === JSFrameworkOption.NO_FRAMEWORK &&
    settings.css === CSSOption.TAILWIND
  ) {
    return (
      <div>
        Generating <span className="font-bold">HTML</span> +{" "}
        <span className="font-bold">Tailwind</span> code
      </div>
    );
  } else if (
    settings.js === JSFrameworkOption.NO_FRAMEWORK &&
    settings.css === CSSOption.BOOTSTRAP
  ) {
    return (
      <div>
        Generating <span className="font-bold">HTML</span> +{" "}
        <span className="font-bold">Bootstrap</span> code
      </div>
    );
  }
}

interface Props {
  outputSettings: OutputSettings;
  setOutputSettings: React.Dispatch<React.SetStateAction<OutputSettings>>;
}

function OutputSettingsSection({ outputSettings, setOutputSettings }: Props) {
  const onCSSValueChange = (value: string) => {
    setOutputSettings((prev) => {
      if (prev.js === JSFrameworkOption.REACT) {
        if (value !== CSSOption.TAILWIND) {
          toast.error(
            "React only supports Tailwind CSS. Change JS framework to Vanilla to use Bootstrap."
          );
        }
        return {
          css: CSSOption.TAILWIND,
          js: JSFrameworkOption.REACT,
        };
      } else {
        return {
          ...prev,
          css: convertStringToCSSOption(value),
        };
      }
    });
  };

  const onJsFrameworkChange = (value: string) => {
    if (value === JSFrameworkOption.REACT) {
      setOutputSettings(() => ({
        css: CSSOption.TAILWIND,
        js: value as JSFrameworkOption,
      }));
    } else {
      setOutputSettings((prev) => ({
        ...prev,
        js: value as JSFrameworkOption,
      }));
    }
  };

  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      {generateDisplayString(outputSettings)}{" "}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Customize</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Code Settings</h4>
              <p className="text-muted-foreground">
                Customize your code output
              </p>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="output-settings-js">JS</Label>
                <Select
                  value={outputSettings.js}
                  onValueChange={onJsFrameworkChange}
                >
                  <SelectTrigger
                    className="col-span-2 h-8"
                    id="output-settings-js"
                  >
                    {displayJSOption(outputSettings.js)}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={JSFrameworkOption.NO_FRAMEWORK}>
                        No Framework
                      </SelectItem>
                      <SelectItem value={JSFrameworkOption.REACT}>
                        React
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="output-settings-css">CSS</Label>
                <Select
                  value={outputSettings.css}
                  onValueChange={onCSSValueChange}
                >
                  <SelectTrigger
                    className="col-span-2 h-8"
                    id="output-settings-css"
                  >
                    {displayCSSOption(outputSettings.css)}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={CSSOption.TAILWIND}>
                        Tailwind
                      </SelectItem>
                      <SelectItem value={CSSOption.BOOTSTRAP}>
                        Bootstrap
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default OutputSettingsSection;
