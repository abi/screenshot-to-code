import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { CSSOption, OutputSettings } from "../types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

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
  setOutputSettings: (outputSettings: OutputSettings) => void;
}

function OutputSettingsSection({ outputSettings, setOutputSettings }: Props) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Output Settings</AccordionTrigger>
        <AccordionContent>
          <div className="flex justify-between items-center">
            <span className="text-sm">CSS</span>
            <Select
              value={outputSettings.css}
              onValueChange={(value) =>
                setOutputSettings({
                  css: convertStringToCSSOption(value),
                })
              }
            >
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default OutputSettingsSection;
