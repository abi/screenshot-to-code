// Keep in sync with backend (llm.py)
// Order here matches dropdown order
export enum CodeGenerationModel {
  CLAUDE_4_5_SONNET_2025_09_29 = "claude-sonnet-4-5-20250929",
}

// Will generate a static error if a model in the enum above is not in the descriptions
export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", inBeta: false },
};
