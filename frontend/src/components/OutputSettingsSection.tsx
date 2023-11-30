import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { GeneratedCodeConfig } from "../types";

function generateDisplayComponent(config: GeneratedCodeConfig) {
  switch (config) {
    case GeneratedCodeConfig.HTML_TAILWIND:
      return (
        <div>
          <span className="font-semibold">HTML</span> +{" "}
          <span className="font-semibold">Tailwind</span>
        </div>
      );
    case GeneratedCodeConfig.REACT_TAILWIND:
      return (
        <div>
          <span className="font-semibold">React</span> +{" "}
          <span className="font-semibold">Tailwind</span>
        </div>
      );
    case GeneratedCodeConfig.BOOTSTRAP:
      return (
        <div>
          <span className="font-semibold">Bootstrap</span>
        </div>
      );
    case GeneratedCodeConfig.IONIC_TAILWIND:
      return (
        <div>
          <span className="font-semibold">Ionic</span> +{" "}
          <span className="font-semibold">Tailwind</span>
        </div>
      );
    default:
      // TODO: Should never reach this out. Error out
      return config;
  }
}

interface Props {
  generatedCodeConfig: GeneratedCodeConfig;
  setGeneratedCodeConfig: (config: GeneratedCodeConfig) => void;
  shouldDisableUpdates?: boolean;
}

function OutputSettingsSection({
  generatedCodeConfig,
  setGeneratedCodeConfig,
  shouldDisableUpdates = false,
}: Props) {
  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      <div className="grid grid-cols-3 items-center gap-4">
        <span>Generating:</span>
        <Select
          value={generatedCodeConfig}
          onValueChange={(value: string) =>
            setGeneratedCodeConfig(value as GeneratedCodeConfig)
          }
          disabled={shouldDisableUpdates}
        >
          <SelectTrigger className="col-span-2" id="output-settings-js">
            {generateDisplayComponent(generatedCodeConfig)}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={GeneratedCodeConfig.HTML_TAILWIND}>
                {generateDisplayComponent(GeneratedCodeConfig.HTML_TAILWIND)}
              </SelectItem>
              <SelectItem value={GeneratedCodeConfig.REACT_TAILWIND}>
                {generateDisplayComponent(GeneratedCodeConfig.REACT_TAILWIND)}
              </SelectItem>
              <SelectItem value={GeneratedCodeConfig.BOOTSTRAP}>
                {generateDisplayComponent(GeneratedCodeConfig.BOOTSTRAP)}
              </SelectItem>
              <SelectItem value={GeneratedCodeConfig.IONIC_TAILWIND}>
                {generateDisplayComponent(GeneratedCodeConfig.IONIC_TAILWIND)}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default OutputSettingsSection;
