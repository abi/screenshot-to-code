export type HistoryItemType = "ai_create" | "ai_edit";

export type HistoryItem =
  | {
      type: "ai_create";
      code: string;
      inputs: AiCreateInputs;
    }
  | {
      type: "ai_edit";
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
