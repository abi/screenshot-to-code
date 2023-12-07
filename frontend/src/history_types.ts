export type HistoryItemType = "ai_create" | "ai_edit";

export type HistoryItem =
  | {
      type: "ai_create";
      parent: null | number;
      code: string;
      inputs: AiCreateInputs;
    }
  | {
      type: "ai_edit";
      parent: null | number;
      code: string;
      inputs: AiEditInputs;
    };

export type AiCreateInputs = {
  image_url: string;
};

export type AiEditInputs = {
  prompt: string;
};

export type History = HistoryItem[];
