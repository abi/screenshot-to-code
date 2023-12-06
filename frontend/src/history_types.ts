export type HistoryItemType =
  | "ai_create"
  | "code_create"
  | "ai_edit"
  | "revert"
  | "code_edit";

export type HistoryItem = {
  type: HistoryItemType;
  code?: string;
  inputs:
    | AiCreateInputs
    | CodeCreateInputs
    | AiEditInputs
    | RevertInputs
    | CodeEditInputs;
};

export type AiCreateInputs = {
  image_url?: string;
};

export type CodeCreateInputs = {
  // Define specific properties relevant for code creation
};

export type AiEditInputs = {
  previous_commands: string[];
  new_instruction: string;
};

export type RevertInputs = {
  parent: number;
};

export type CodeEditInputs = {
  // TODO: Fill in
};

export type History = HistoryItem[];
