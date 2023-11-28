import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { CSSOption, JSFrameworkOption, OutputSettings } from "../types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { capitalize } from "../lib/utils";
import toast from "react-hot-toast";
import { IS_RUNNING_ON_CLOUD } from "../config";
import { Badge } from "./ui/badge";

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

interface Props {
  outputSettings: OutputSettings;
  setOutputSettings: React.Dispatch<React.SetStateAction<OutputSettings>>;
}

function OutputSettingsSection({ outputSettings, setOutputSettings }: Props) {
  const onCSSValueChange = (value: string) => {
    if (IS_RUNNING_ON_CLOUD) {
      toast.error("Upgrade to the Business plan to change CSS framework.");
      return;
    }

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
    if (IS_RUNNING_ON_CLOUD) {
      toast.error("Upgrade to the Business plan to change JS framework.");
      return;
    }

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
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <div className="flex gap-x-2">
            Output Settings{" "}
            {IS_RUNNING_ON_CLOUD && <Badge variant="outline">Pro</Badge>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="gap-y-2 flex flex-col pt-2">
          <div className="flex justify-between items-center pr-2">
            <span className="text-sm">CSS</span>
            <Select value={outputSettings.css} onValueChange={onCSSValueChange}>
              <SelectTrigger className="w-[180px]">
                {displayCSSOption(outputSettings.css)}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={CSSOption.TAILWIND}>Tailwind</SelectItem>
                  <SelectItem value={CSSOption.BOOTSTRAP}>Bootstrap</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between items-center pr-2">
            <span className="text-sm">JS Framework</span>
            <Select
              value={outputSettings.js}
              onValueChange={onJsFrameworkChange}
            >
              <SelectTrigger className="w-[180px]">
                {capitalize(outputSettings.js)}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={JSFrameworkOption.VANILLA}>
                    Vanilla
                  </SelectItem>
                  <SelectItem value={JSFrameworkOption.REACT}>React</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default OutputSettingsSection;
