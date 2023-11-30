import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import {
  CSSOption,
  UIComponentOption,
  JSFrameworkOption,
  OutputSettings,
} from "../types";
import { capitalize } from "../lib/utils";
import toast from "react-hot-toast";
import { useEffect } from "react";
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
      <div className="text-gray-800 dark:text-white">
        Generating <span className="font-bold">React</span> +{" "}
        <span className="font-bold">Tailwind</span> code
      </div>
    );
  } else if (
    settings.js === JSFrameworkOption.NO_FRAMEWORK &&
    settings.css === CSSOption.TAILWIND
  ) {
    return (
      <div className="text-gray-800 dark:text-white">
        Generating <span className="font-bold">HTML</span> +{" "}
        <span className="font-bold">Tailwind</span> code
      </div>
    );
  } else if (
    settings.js === JSFrameworkOption.NO_FRAMEWORK &&
    settings.css === CSSOption.BOOTSTRAP
  ) {
    return (
      <div className="text-gray-800 dark:text-white">
        Generating <span className="font-bold">HTML</span> +{" "}
        <span className="font-bold">Bootstrap</span> code
      </div>
    );
  }
}

interface Props {
  outputSettings: OutputSettings;
  setOutputSettings: React.Dispatch<React.SetStateAction<OutputSettings>>;
  shouldDisableUpdates?: boolean;
}

function OutputSettingsSection({
  outputSettings,
  setOutputSettings,
  shouldDisableUpdates = false,
}: Props) {
  const onCSSValueChange = (value: string) => {
    setOutputSettings((prev) => {
      if (prev.js === JSFrameworkOption.REACT) {
        if (value !== CSSOption.TAILWIND) {
          toast.error(
            'React only supports Tailwind CSS. Change JS framework to "No Framework" to use Bootstrap.'
          );
        }
        return {
          css: CSSOption.TAILWIND,
          js: JSFrameworkOption.REACT,
          components: UIComponentOption.HTML,
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
        components: UIComponentOption.HTML,
      }));
    } else {
      setOutputSettings((prev) => ({
        ...prev,
        js: value as JSFrameworkOption,
      }));
    }
  };

  const onUIComponentOptionChange = (value: string) => {
    if (value === UIComponentOption.IONIC) {
      setOutputSettings(() => ({
        css: CSSOption.TAILWIND,
        js: JSFrameworkOption.NO_FRAMEWORK,
        components: value as UIComponentOption,
      }));
    } else {
      setOutputSettings((prev) => ({
        ...prev,
        components: value as UIComponentOption,
      }));
    }
  };

  const checkUIComponentOptionOrDefault = (
    valueItem: UIComponentOption
  ): UIComponentOption => {
    switch (valueItem) {
      case UIComponentOption.IONIC:
        if (
          outputSettings.js != JSFrameworkOption.NO_FRAMEWORK ||
          outputSettings.css != CSSOption.TAILWIND
        ) {
          return UIComponentOption.HTML;
        }
    }
    return valueItem;
  };

  const checkCSSOptionOrDefault = (valueItem: CSSOption): CSSOption => {
    switch (valueItem) {
      default:
        return valueItem;
    }
  };

  const checkJSFrameworkOptionOrDefault = (
    valueItem: JSFrameworkOption
  ): JSFrameworkOption => {
    switch (valueItem) {
      case JSFrameworkOption.REACT:
        if (outputSettings.css != CSSOption.TAILWIND) {
          return JSFrameworkOption.NO_FRAMEWORK;
        }
        break;
    }
    return valueItem;
  };

  useEffect(() => {
    checkOutputSettingsOptions();
  }, [outputSettings]);

  const checkOutputSettingsOptions = () => {
    if (
      isHiddenOption(outputSettings.css) ||
      isHiddenOption(outputSettings.js) ||
      isHiddenOption(outputSettings.components)
    ) {
      setOutputSettings((prev) => {
        return {
          css: checkCSSOptionOrDefault(prev.css),
          js: checkJSFrameworkOptionOrDefault(prev.js),
          components: checkUIComponentOptionOrDefault(prev.components),
        };
      });
    }
  };

  const isHiddenOption = (
    option: CSSOption | JSFrameworkOption | UIComponentOption
  ): boolean => {
    if (Object.values(CSSOption).includes(option as CSSOption)) {
      return checkCSSOptionOrDefault(option as CSSOption) != option;
    }
    if (
      Object.values(JSFrameworkOption).includes(option as JSFrameworkOption)
    ) {
      return (
        checkJSFrameworkOptionOrDefault(option as JSFrameworkOption) != option
      );
    }
    if (
      Object.values(UIComponentOption).includes(option as UIComponentOption)
    ) {
      return (
        checkUIComponentOptionOrDefault(option as UIComponentOption) != option
      );
    }
    return true;
  };

  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      {generateDisplayString(outputSettings)}{" "}
      {!shouldDisableUpdates && (
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
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="output-settings-component">Components</Label>
                  <Select
                    value={outputSettings.components}
                    onValueChange={onUIComponentOptionChange}
                  >
                    <SelectTrigger
                      id="output-settings-component"
                      className="col-span-2 h-8"
                    >
                      {capitalize(outputSettings.components)}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={UIComponentOption.HTML}>
                          HTML
                        </SelectItem>
                        <SelectItem
                          value={UIComponentOption.IONIC}
                          disabled={isHiddenOption(UIComponentOption.IONIC)}
                        >
                          Ionic
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default OutputSettingsSection;
