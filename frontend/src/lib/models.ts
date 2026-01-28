// Keep in sync with backend (llm.py)
// Order here matches dropdown order
export enum CodeGenerationModel {
  CLAUDE_4_5_SONNET_2025_09_29 = "claude-sonnet-4-5-20250929",
  GPT_4O_2024_05_13 = "gpt-4o-2024-05-13",
  GPT_4_TURBO_2024_04_09 = "gpt-4-turbo-2024-04-09",
  GPT_4_VISION = "gpt_4_vision",
  CLAUDE_3_SONNET = "claude_3_sonnet",
}

// Video model options for video-to-code generation
export enum VideoModel {
  GEMINI_3_PRO_HIGH = "gemini-3-pro-preview (high thinking)",
  GEMINI_3_PRO_LOW = "gemini-3-pro-preview (low thinking)",
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "gpt-4o-2024-05-13": { name: "GPT-4o", inBeta: false },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", inBeta: false },
  "gpt-4-turbo-2024-04-09": { name: "GPT-4 Turbo (deprecated)", inBeta: false },
  gpt_4_vision: { name: "GPT-4 Vision (deprecated)", inBeta: false },
  claude_3_sonnet: { name: "Claude 3 (deprecated)", inBeta: false },
};

export const VIDEO_MODEL_DESCRIPTIONS: {
  [key in VideoModel]: { name: string; inBeta: boolean };
} = {
  "gemini-3-pro-preview (high thinking)": {
    name: "Gemini 3 Pro (High)",
    inBeta: true,
  },
  "gemini-3-pro-preview (low thinking)": {
    name: "Gemini 3 Pro (Low)",
    inBeta: true,
  },
};
