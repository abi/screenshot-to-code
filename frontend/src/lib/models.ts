// Keep in sync with backend (llm.py)
// Order here matches dropdown order
export enum CodeGenerationModel {
  CLAUDE_OPUS_4_8_LOW = "claude-opus-4-8 (low effort)",
  CLAUDE_OPUS_4_8_MEDIUM = "claude-opus-4-8 (medium effort)",
  CLAUDE_OPUS_4_8_HIGH = "claude-opus-4-8 (high effort)",
  CLAUDE_OPUS_4_8_XHIGH = "claude-opus-4-8 (xhigh effort)",
  CLAUDE_OPUS_4_8_MAX = "claude-opus-4-8 (max effort)",
  CLAUDE_OPUS_4_6 = "claude-opus-4-6",
  CLAUDE_SONNET_4_6 = "claude-sonnet-4-6",
  GPT_5_5_NONE = "gpt-5.5 (no thinking)",
  GPT_5_5_LOW = "gpt-5.5 (low thinking)",
  GPT_5_5_MEDIUM = "gpt-5.5 (medium thinking)",
  GPT_5_5_HIGH = "gpt-5.5 (high thinking)",
  GPT_5_5_XHIGH = "gpt-5.5 (xhigh thinking)",
  GPT_5_2_CODEX_LOW = "gpt-5.2-codex (low thinking)",
  GPT_5_2_CODEX_MEDIUM = "gpt-5.2-codex (medium thinking)",
  GPT_5_2_CODEX_HIGH = "gpt-5.2-codex (high thinking)",
  GPT_5_2_CODEX_XHIGH = "gpt-5.2-codex (xhigh thinking)",
  GPT_5_4_MINI_LOW = "gpt-5.4-mini (low thinking)",
  GEMINI_3_FLASH_PREVIEW_HIGH = "gemini-3-flash-preview (high thinking)",
  GEMINI_3_FLASH_PREVIEW_MINIMAL = "gemini-3-flash-preview (minimal thinking)",
  GEMINI_3_1_PRO_PREVIEW_HIGH = "gemini-3.1-pro-preview (high thinking)",
  GEMINI_3_1_PRO_PREVIEW_MEDIUM = "gemini-3.1-pro-preview (medium thinking)",
  GEMINI_3_1_PRO_PREVIEW_LOW = "gemini-3.1-pro-preview (low thinking)",
  GEMINI_3_5_FLASH_HIGH = "gemini-3.5-flash (high thinking)",
  GEMINI_3_5_FLASH_MEDIUM = "gemini-3.5-flash (medium thinking)",
  GEMINI_3_5_FLASH_LOW = "gemini-3.5-flash (low thinking)",
  GEMINI_3_5_FLASH_MINIMAL = "gemini-3.5-flash (minimal thinking)",
}

export type VariantLabelTone = "flash" | "max" | "pro" | "code" | "neutral";

export interface VariantLabel {
  text: string;
  tone: VariantLabelTone;
}

// Short, friendly badge shown on each variant tile, derived from the model.
// Anchors requested by product: Gemini 3 Flash (minimal) -> "Flash",
// Gemini 3.1 Pro (high) -> "Max".
const VARIANT_LABELS: Partial<Record<CodeGenerationModel, VariantLabel>> = {
  [CodeGenerationModel.GEMINI_3_FLASH_PREVIEW_MINIMAL]: { text: "Flash", tone: "flash" },
  [CodeGenerationModel.GEMINI_3_FLASH_PREVIEW_HIGH]: { text: "Flash+", tone: "flash" },
  [CodeGenerationModel.GEMINI_3_1_PRO_PREVIEW_HIGH]: { text: "Max", tone: "max" },
  [CodeGenerationModel.GEMINI_3_1_PRO_PREVIEW_MEDIUM]: { text: "Pro", tone: "pro" },
  [CodeGenerationModel.GEMINI_3_1_PRO_PREVIEW_LOW]: { text: "Pro", tone: "pro" },
  [CodeGenerationModel.GPT_5_2_CODEX_HIGH]: { text: "Codex", tone: "code" },
};

export function getVariantLabel(model?: string): VariantLabel | null {
  if (!model) return null;
  const exact = VARIANT_LABELS[model as CodeGenerationModel];
  if (exact) return exact;
  // Family fallback so any model still gets a sensible badge.
  if (model.includes("gemini-3.1-pro")) return { text: "Pro", tone: "pro" };
  if (model.includes("flash")) return { text: "Flash", tone: "flash" };
  if (model.includes("codex")) return { text: "Codex", tone: "code" };
  if (model.includes("gpt")) return { text: "GPT", tone: "code" };
  if (model.includes("opus")) return { text: "Opus", tone: "max" };
  if (model.includes("sonnet")) return { text: "Sonnet", tone: "pro" };
  if (model.includes("fable")) return { text: "Fable", tone: "max" };
  return null;
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string };
} = {
  "gpt-5.5 (no thinking)": {
    name: "GPT 5.5 (none)",
  },
  "gpt-5.5 (low thinking)": {
    name: "GPT 5.5 (low)",
  },
  "gpt-5.5 (medium thinking)": {
    name: "GPT 5.5 (medium)",
  },
  "gpt-5.5 (high thinking)": {
    name: "GPT 5.5 (high)",
  },
  "gpt-5.5 (xhigh thinking)": {
    name: "GPT 5.5 (xhigh)",
  },
  "gpt-5.2-codex (low thinking)": {
    name: "GPT 5.2 Codex (low)",
  },
  "gpt-5.2-codex (medium thinking)": {
    name: "GPT 5.2 Codex (medium)",
  },
  "gpt-5.2-codex (high thinking)": {
    name: "GPT 5.2 Codex (high)",
  },
  "gpt-5.2-codex (xhigh thinking)": {
    name: "GPT 5.2 Codex (xhigh)",
  },
  "gpt-5.4-mini (low thinking)": {
    name: "GPT 5.4 Mini (low)",
  },
  "claude-opus-4-8 (low effort)": {
    name: "Claude Opus 4.8 (low)",
  },
  "claude-opus-4-8 (medium effort)": {
    name: "Claude Opus 4.8 (medium)",
  },
  "claude-opus-4-8 (high effort)": {
    name: "Claude Opus 4.8 (high)",
  },
  "claude-opus-4-8 (xhigh effort)": {
    name: "Claude Opus 4.8 (xhigh)",
  },
  "claude-opus-4-8 (max effort)": {
    name: "Claude Opus 4.8 (max)",
  },
  "claude-opus-4-6": { name: "Claude Opus 4.6" },
  "claude-sonnet-4-6": { name: "Claude Sonnet 4.6" },
  "gemini-3.5-flash (high thinking)": {
    name: "Gemini 3.5 Flash (high)",
  },
  "gemini-3.5-flash (medium thinking)": {
    name: "Gemini 3.5 Flash (medium)",
  },
  "gemini-3.5-flash (low thinking)": {
    name: "Gemini 3.5 Flash (low)",
  },
  "gemini-3.5-flash (minimal thinking)": {
    name: "Gemini 3.5 Flash (minimal)",
  },
  "gemini-3-flash-preview (high thinking)": {
    name: "Gemini 3 Flash (high)",
  },
  "gemini-3-flash-preview (minimal thinking)": {
    name: "Gemini 3 Flash (minimal)",
  },
  "gemini-3.1-pro-preview (high thinking)": {
    name: "Gemini 3.1 Pro (high)",
  },
  "gemini-3.1-pro-preview (medium thinking)": {
    name: "Gemini 3.1 Pro (medium)",
  },
  "gemini-3.1-pro-preview (low thinking)": {
    name: "Gemini 3.1 Pro (low)",
  },
};
