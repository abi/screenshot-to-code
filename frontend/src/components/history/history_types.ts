export type HistoryItemType = "ai_create" | "ai_edit" | "code_create";

type CommonHistoryItem = {
  parentIndex: null | number;
  code: string;
};

export type HistoryItem =
  | ({
      type: "ai_create";
      inputs: AiCreateInputs;
    } & CommonHistoryItem)
  | ({
      type: "ai_edit";
      inputs: AiEditInputs;
    } & CommonHistoryItem)
  | ({
      type: "code_create";
      inputs: CodeCreateInputs;
    } & CommonHistoryItem);

export type AiCreateInputs = {
  image_url: string;
};

export type AiEditInputs = {
  prompt: string;
};

export type CodeCreateInputs = {
  code: string;
};

export type History = HistoryItem[];

export type RenderedHistoryItem = {
  type: string;
  summary: string;
  parentVersion: string | null;
  isActive: boolean;
};
