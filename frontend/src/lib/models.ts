// Keep in sync with backend (llm.py)
// Runtime model values are Gemini-only. Legacy enum members are preserved as aliases
// so existing persisted state and older references do not break the frontend.
export enum CodeGenerationModel {
  CLAUDE_OPUS_4_6 = "gemini-3.1-pro-preview (high thinking)",
  CLAUDE_SONNET_4_6 = "gemini-3.1-pro-preview (medium thinking)",
  CLAUDE_4_5_OPUS_2025_11_01 = "gemini-3.1-pro-preview (high thinking)",
  CLAUDE_4_5_SONNET_2025_09_29 = "gemini-3.1-pro-preview (medium thinking)",
  GPT_5_2_CODEX_LOW = "gemini-3-flash-preview (minimal thinking)",
  GPT_5_2_CODEX_MEDIUM = "gemini-3-flash-preview (high thinking)",
  GPT_5_2_CODEX_HIGH = "gemini-3.1-pro-preview (high thinking)",
  GPT_5_2_CODEX_XHIGH = "gemini-3.1-pro-preview (high thinking)",
  GPT_5_3_CODEX_LOW = "gemini-3-flash-preview (minimal thinking)",
  GPT_5_3_CODEX_MEDIUM = "gemini-3-flash-preview (high thinking)",
  GPT_5_3_CODEX_HIGH = "gemini-3.1-pro-preview (high thinking)",
  GPT_5_3_CODEX_XHIGH = "gemini-3.1-pro-preview (high thinking)",
  GEMINI_3_FLASH_PREVIEW_HIGH = "gemini-3-flash-preview (high thinking)",
  GEMINI_3_FLASH_PREVIEW_MINIMAL = "gemini-3-flash-preview (minimal thinking)",
  GEMINI_3_1_PRO_PREVIEW_HIGH = "gemini-3.1-pro-preview (high thinking)",
  GEMINI_3_1_PRO_PREVIEW_MEDIUM = "gemini-3.1-pro-preview (medium thinking)",
  GEMINI_3_1_PRO_PREVIEW_LOW = "gemini-3.1-pro-preview (low thinking)",
}

export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
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
};
