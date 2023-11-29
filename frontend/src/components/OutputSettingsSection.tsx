import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { CSSOption, UIComponentOption, JSFrameworkOption, OutputSettings } from "../types";
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
import { useEffect } from "react";

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
          components: UIComponentOption.HTML
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
        components: UIComponentOption.HTML
      }));
    } else {
      setOutputSettings((prev) => ({
        ...prev,
        js: value as JSFrameworkOption,
      }));
    }
  };

  const onUIComponentOptionChange = (value: string) => {
    if (IS_RUNNING_ON_CLOUD) {
      toast.error("Upgrade to the Business plan to change Components library.");
      return;
    }

    if (value === UIComponentOption.IONIC) {
      setOutputSettings(() => ({
        css: CSSOption.TAILWIND,
        js: JSFrameworkOption.VANILLA,
        components: value as UIComponentOption
      }));
    } else {
      setOutputSettings((prev) => ({
        ...prev,
        components: value as UIComponentOption,
      }));
    }
  };


  const checkUIComponentOptionOrDefault = (valueItem: UIComponentOption  ) :  UIComponentOption  => {
    switch (valueItem) {
      case UIComponentOption.IONIC:
        if (outputSettings.js != JSFrameworkOption.VANILLA || outputSettings.css != CSSOption.TAILWIND) {
          return UIComponentOption.HTML
        }
    }
    return valueItem;
  }

  const checkCSSOptionOrDefault = (valueItem: CSSOption  ) :  CSSOption  => {
    switch (valueItem) {
      default:
        return valueItem;
    }
  }

  const checkJSFrameworkOptionOrDefault = (valueItem: JSFrameworkOption  ) :  JSFrameworkOption  => {
    switch (valueItem) {
      case JSFrameworkOption.REACT:
        if(outputSettings.css != CSSOption.TAILWIND) {
          return JSFrameworkOption.VANILLA
        }
        break;
    }
    return valueItem;
  }

  useEffect(() => {
    checkOutputSettingsOptions();
  }, [outputSettings]);

  const checkOutputSettingsOptions = () => {
    if ( isHiddenOption(outputSettings.css) || isHiddenOption(outputSettings.js) || isHiddenOption(outputSettings.components))
      {
        setOutputSettings((prev) => {
          return {
            css: checkCSSOptionOrDefault(prev.css),
            js: checkJSFrameworkOptionOrDefault(prev.js),
            components: checkUIComponentOptionOrDefault(prev.components),
          };
        })
      }
  };

  const isHiddenOption = ( option : CSSOption| JSFrameworkOption | UIComponentOption ) : boolean => {
    if (Object.values(CSSOption).includes(option as CSSOption)){
      return checkCSSOptionOrDefault(option as CSSOption) != option
    }
    if (Object.values(JSFrameworkOption).includes(option as JSFrameworkOption)){
      return checkJSFrameworkOptionOrDefault(option as JSFrameworkOption) != option
    }
    if (Object.values(UIComponentOption).includes(option as UIComponentOption)){
      return checkUIComponentOptionOrDefault(option as UIComponentOption) != option
    }
    return true
  }

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
                  <SelectItem value={JSFrameworkOption.REACT} disabled={isHiddenOption(JSFrameworkOption.REACT)}>React</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between items-center pr-2">
            <span className="text-sm">Component Library</span>
            <Select
              value={outputSettings.components}
              onValueChange={onUIComponentOptionChange}
            >
              <SelectTrigger className="w-[180px]">
                {capitalize(outputSettings.components)}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={UIComponentOption.HTML}>HTML</SelectItem>
                  <SelectItem value={UIComponentOption.IONIC} disabled={isHiddenOption(UIComponentOption.IONIC)}>Ionic</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between pr-2 mt-2"> 
            <span className="text-sm text-gray-500">Output: {outputSettings.js} + {outputSettings.css} + {outputSettings.components}</span>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default OutputSettingsSection;
