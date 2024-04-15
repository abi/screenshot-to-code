// Keep in sync with backend (llm.py)
export enum CodeGenerationModel {
  GPT_4_TURBO_2024_04_09 = "gpt-4-turbo-2024-04-09",
  GPT_4_VISION = "gpt_4_vision",
  CLAUDE_3_SONNET = "claude_3_sonnet",
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "gpt-4-turbo-2024-04-09": { name: "GPT-4 Turbo (Apr 2024)", inBeta: false },
  gpt_4_vision: { name: "GPT-4 Vision (Nov 2023)", inBeta: false },
  claude_3_sonnet: { name: "Claude 3 Sonnet", inBeta: false },
};
