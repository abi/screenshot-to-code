export type HistoryItemType = "ai_create" | "ai_edit";

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
    } & CommonHistoryItem);

export type AiCreateInputs = {
  image_url: string;
};

export type AiEditInputs = {
  prompt: string;
};

export type History = HistoryItem[];
