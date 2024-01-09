import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { GeneratedCodeConfig, STACK_DESCRIPTION } from "../types";
import { Badge } from "./ui/badge";

function generateDisplayComponent(stack: GeneratedCodeConfig) {
  const stackComponents = STACK_DESCRIPTION[stack].components;

  return (
    <div>
      {stackComponents.map((component, index) => (
        <React.Fragment key={index}>
          <span className="font-semibold">{component}</span>
          {index < stackComponents.length - 1 && " + "}
        </React.Fragment>
      ))}
    </div>
  );
}

interface Props {
  generatedCodeConfig: GeneratedCodeConfig | undefined;
  setGeneratedCodeConfig: (config: GeneratedCodeConfig) => void;
  label?: string;
  shouldDisableUpdates?: boolean;
}

function OutputSettingsSection({
  generatedCodeConfig,
  setGeneratedCodeConfig,
  label = "Generating:",
  shouldDisableUpdates = false,
}: Props) {
  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      <div className="grid grid-cols-3 items-center gap-4">
        <span>{label}</span>
        <Select
          value={generatedCodeConfig}
          onValueChange={(value: string) =>
            setGeneratedCodeConfig(value as GeneratedCodeConfig)
          }
          disabled={shouldDisableUpdates}
        >
          <SelectTrigger className="col-span-2" id="output-settings-js">
            {generatedCodeConfig
              ? generateDisplayComponent(generatedCodeConfig)
              : "Select a stack"}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.values(GeneratedCodeConfig).map((stack) => (
                <SelectItem value={stack}>
                  <div className="flex items-center">
                    {generateDisplayComponent(stack)}
                    {STACK_DESCRIPTION[stack].inBeta && (
                      <Badge className="ml-2" variant="secondary">
                        Beta
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default OutputSettingsSection;
