// Keep in sync with backend (llm.py)
export enum CodeGenerationModel {
  GPT_4_VISION = "gpt_4_vision",
  CLAUDE_3_SONNET = "claude_3_sonnet",
}

export const CODE_GENERATION_MODEL_DESCRIPTIONS: {
  [key in CodeGenerationModel]: { name: string; inBeta: boolean };
} = {
  gpt_4_vision: { name: "GPT-4 Vision", inBeta: false },
  claude_3_sonnet: { name: "Claude 3 Sonnet", inBeta: true },
};
