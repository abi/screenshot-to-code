import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Stack } from "../../lib/stacks";
import StackLabel from "../core/StackLabel";
import DesignSystemSelector, {
  DesignSystemSelectorProps,
} from "./DesignSystemSelector";

interface Props {
  stack: Stack | undefined;
  setStack: (config: Stack) => void;
  label?: string;
  shouldDisableUpdates?: boolean;
  designSystem?: DesignSystemSelectorProps;
  inline?: boolean;
}

function OutputSettingsSection({
  stack,
  setStack,
  label = "Stack:",
  shouldDisableUpdates = false,
  designSystem,
  inline = false,
}: Props) {
  const stackSelect = (
    <Select
      value={stack ?? ""}
      onValueChange={(value: string) => setStack(value as Stack)}
      disabled={shouldDisableUpdates}
    >
      <SelectTrigger
        className={inline ? "w-auto gap-2 font-medium" : "col-span-2"}
        id="output-settings-js"
        data-testid="stack-select"
      >
        <SelectValue placeholder="Select a stack" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {Object.values(Stack).map((stack) => (
            <SelectItem key={stack} value={stack}>
              <div className="flex items-center">
                <StackLabel stack={stack} />
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  if (inline) {
    return (
      <div className="flex items-center gap-2">
        {stackSelect}
        {designSystem && <DesignSystemSelector {...designSystem} compact />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      <div className="grid grid-cols-3 items-center gap-4">
        <span>{label}</span>
        {stackSelect}
      </div>
      {designSystem && (
        <DesignSystemSelector {...designSystem} />
      )}
    </div>
  );
}

export default OutputSettingsSection;
