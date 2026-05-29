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
  CLAUDE_4_5_OPUS_2025_11_01 = "claude-opus-4-5-20251101",
  CLAUDE_4_5_SONNET_2025_09_29 = "claude-sonnet-4-5-20250929",
  GPT_5_5_XHIGH = "gpt-5.5 (xhigh thinking)",
  GPT_5_2_CODEX_LOW = "gpt-5.2-codex (low thinking)",
  GPT_5_2_CODEX_MEDIUM = "gpt-5.2-codex (medium thinking)",
  GPT_5_2_CODEX_HIGH = "gpt-5.2-codex (high thinking)",
  GPT_5_2_CODEX_XHIGH = "gpt-5.2-codex (xhigh thinking)",
  GPT_5_3_CODEX_LOW = "gpt-5.3-codex (low thinking)",
  GPT_5_3_CODEX_MEDIUM = "gpt-5.3-codex (medium thinking)",
  GPT_5_3_CODEX_HIGH = "gpt-5.3-codex (high thinking)",
  GPT_5_3_CODEX_XHIGH = "gpt-5.3-codex (xhigh thinking)",
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

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "gpt-5.5 (xhigh thinking)": {
    name: "GPT 5.5 (xhigh)",
    inBeta: true,
  },
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
  "gpt-5.3-codex (low thinking)": {
    name: "GPT 5.3 Codex (low)",
    inBeta: true,
  },
  "gpt-5.3-codex (medium thinking)": {
    name: "GPT 5.3 Codex (medium)",
    inBeta: true,
  },
  "gpt-5.3-codex (high thinking)": {
    name: "GPT 5.3 Codex (high)",
    inBeta: true,
  },
  "gpt-5.3-codex (xhigh thinking)": {
    name: "GPT 5.3 Codex (xhigh)",
    inBeta: true,
  },
  "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", inBeta: false },
  "claude-opus-4-8 (low effort)": {
    name: "Claude Opus 4.8 (low)",
    inBeta: true,
  },
  "claude-opus-4-8 (medium effort)": {
    name: "Claude Opus 4.8 (medium)",
    inBeta: true,
  },
  "claude-opus-4-8 (high effort)": {
    name: "Claude Opus 4.8 (high)",
    inBeta: true,
  },
  "claude-opus-4-8 (xhigh effort)": {
    name: "Claude Opus 4.8 (xhigh)",
    inBeta: true,
  },
  "claude-opus-4-8 (max effort)": {
    name: "Claude Opus 4.8 (max)",
    inBeta: true,
  },
  "claude-opus-4-6": { name: "Claude Opus 4.6", inBeta: false },
  "claude-sonnet-4-6": { name: "Claude Sonnet 4.6", inBeta: false },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", inBeta: false },
  "gemini-3.5-flash (high thinking)": {
    name: "Gemini 3.5 Flash (high)",
    inBeta: true,
  },
  "gemini-3.5-flash (medium thinking)": {
    name: "Gemini 3.5 Flash (medium)",
    inBeta: true,
  },
  "gemini-3.5-flash (low thinking)": {
    name: "Gemini 3.5 Flash (low)",
    inBeta: true,
  },
  "gemini-3.5-flash (minimal thinking)": {
    name: "Gemini 3.5 Flash (minimal)",
    inBeta: true,
  },
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
