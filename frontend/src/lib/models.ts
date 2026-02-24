// Keep in sync with backend (llm.py)
// Order here matches dropdown order
export enum CodeGenerationModel {
  CLAUDE_OPUS_4_6 = "claude-opus-4-6",
  CLAUDE_SONNET_4_6 = "claude-sonnet-4-6",
  CLAUDE_4_5_OPUS_2025_11_01 = "claude-opus-4-5-20251101",
  CLAUDE_4_5_SONNET_2025_09_29 = "claude-sonnet-4-5-20250929",
  GPT_5_2_CODEX_LOW = "gpt-5.2-codex (low thinking)",
  GPT_5_2_CODEX_MEDIUM = "gpt-5.2-codex (medium thinking)",
  GPT_5_2_CODEX_HIGH = "gpt-5.2-codex (high thinking)",
  GPT_5_2_CODEX_XHIGH = "gpt-5.2-codex (xhigh thinking)",
  GEMINI_3_FLASH_PREVIEW_HIGH = "gemini-3-flash-preview (high thinking)",
  GEMINI_3_FLASH_PREVIEW_MINIMAL = "gemini-3-flash-preview (minimal thinking)",
  GEMINI_3_1_PRO_PREVIEW_HIGH = "gemini-3.1-pro-preview (high thinking)",
  GEMINI_3_1_PRO_PREVIEW_MEDIUM = "gemini-3.1-pro-preview (medium thinking)",
  GEMINI_3_1_PRO_PREVIEW_LOW = "gemini-3.1-pro-preview (low thinking)",
  GEMINI_3_PRO_PREVIEW_HIGH = "gemini-3-pro-preview (high thinking)",
  GEMINI_3_PRO_PREVIEW_LOW = "gemini-3-pro-preview (low thinking)",
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "gpt-5.2-codex (low thinking)": {
    name: "GPT 5.2 Codex (low)",
    inBeta: true,
  },
  "gpt-5.2-codex (medium thinking)": {
    name: "GPT 5.2 Codex (medium)",
    inBeta: true,
  },
  "gpt-5.2-codex (high thinking)": {
    name: "GPT 5.2 Codex (high)",
    inBeta: true,
  },
  "gpt-5.2-codex (xhigh thinking)": {
    name: "GPT 5.2 Codex (xhigh)",
    inBeta: true,
  },
  "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", inBeta: false },
  "claude-opus-4-6": { name: "Claude Opus 4.6", inBeta: false },
  "claude-sonnet-4-6": { name: "Claude Sonnet 4.6", inBeta: false },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", inBeta: false },
  "gemini-3-flash-preview (high thinking)": {
    name: "Gemini 3 Flash (high)",
    inBeta: true,
  },
  "gemini-3-flash-preview (minimal thinking)": {
    name: "Gemini 3 Flash (minimal)",
    inBeta: true,
  },
  "gemini-3.1-pro-preview (high thinking)": {
    name: "Gemini 3.1 Pro (high)",
    inBeta: true,
  },
  "gemini-3.1-pro-preview (medium thinking)": {
    name: "Gemini 3.1 Pro (medium)",
    inBeta: true,
  },
  "gemini-3.1-pro-preview (low thinking)": {
    name: "Gemini 3.1 Pro (low)",
    inBeta: true,
  },
  "gemini-3-pro-preview (high thinking)": {
    name: "Gemini 3 Pro (high)",
    inBeta: true,
  },
  "gemini-3-pro-preview (low thinking)": {
    name: "Gemini 3 Pro (low)",
    inBeta: true,
  },
};
