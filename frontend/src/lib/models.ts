export enum CodeGenerationModel {
  CLAUDE_3_5_SONNET_2024_06_20 = "claude-3-5-sonnet-20240620",
  GPT_4O_2024_05_13 = "gpt-4o",
  GPT_4_TURBO_2024_04_09 = "gpt-4-turbo-preview",
  GPT_4_VISION = "gpt-4-vision-preview",
  CLAUDE_3_SONNET = "claude-3-sonnet",
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "claude-3-5-sonnet-20240620": { name: "Claude 3.5 Sonnet", inBeta: false },
  "gpt-4o": { name: "GPT-4o", inBeta: false },
  "gpt-4-turbo-preview": { name: "GPT-4 Turbo (deprecated)", inBeta: false },
  "gpt-4-vision-preview": { name: "GPT-4 Vision (deprecated)", inBeta: false },
  "claude-3-sonnet": { name: "Claude 3 (deprecated)", inBeta: false },
};
