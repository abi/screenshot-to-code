// Keep in sync with backend (llm.py)
// Order here matches dropdown order
export enum CodeGenerationModel {
  CLAUDE_3_5_SONNET_2024_06_20 = "claude-3-5-sonnet-20240620",
  GPT_4O_2024_05_13 = "gpt-4o-2024-05-13",
  GPT_4_TURBO_2024_04_09 = "gpt-4-turbo-2024-04-09",
  GPT_4_VISION = "gpt_4_vision",
  CLAUDE_3_SONNET = "claude_3_sonnet",
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "gpt-4o-2024-05-13": { name: "GPT-4o", inBeta: false },
  "claude-3-5-sonnet-20240620": { name: "Claude 3.5 Sonnet", inBeta: false },
  "gpt-4-turbo-2024-04-09": { name: "GPT-4 Turbo (deprecated)", inBeta: false },
  gpt_4_vision: { name: "GPT-4 Vision (deprecated)", inBeta: false },
  claude_3_sonnet: { name: "Claude 3 (deprecated)", inBeta: false },
};
