import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import {
  CODE_GENERATION_MODEL_DESCRIPTIONS,
  CodeGenerationModel,
} from "../../lib/models";
import { Badge } from "../ui/badge";

interface Props {
  codeGenerationModel: CodeGenerationModel;
  setCodeGenerationModel: (codeGenerationModel: CodeGenerationModel) => void;
  shouldDisableUpdates?: boolean;
}

function ModelSettingsSection({
  codeGenerationModel,
  setCodeGenerationModel,
  shouldDisableUpdates = false,
}: Props) {
  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      <div className="grid grid-cols-3 items-center gap-4">
        <span>AI Model:</span>
        <Select
          value={codeGenerationModel}
          onValueChange={(value: string) =>
            setCodeGenerationModel(value as CodeGenerationModel)
          }
          disabled={shouldDisableUpdates}
        >
          <SelectTrigger className="col-span-2" id="output-settings-js">
            <span className="font-semibold">
              {CODE_GENERATION_MODEL_DESCRIPTIONS[codeGenerationModel].name}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.values(CodeGenerationModel).map((model) => (
                <SelectItem key={model} value={model}>
                  <div className="flex items-center">
                    <span className="font-semibold">
                      {CODE_GENERATION_MODEL_DESCRIPTIONS[model].name}
                    </span>
                    {CODE_GENERATION_MODEL_DESCRIPTIONS[model].inBeta && (
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

export default ModelSettingsSection;
