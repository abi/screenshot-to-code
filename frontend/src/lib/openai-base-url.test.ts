import {
  OPENROUTER_API_BASE_URL,
  isOpenRouterBaseUrl,
} from "./openai-base-url";

describe("isOpenRouterBaseUrl", () => {
  test("recognizes the official OpenRouter API URL", () => {
    expect(isOpenRouterBaseUrl(OPENROUTER_API_BASE_URL)).toBe(true);
    expect(isOpenRouterBaseUrl("https://www.openrouter.ai")).toBe(true);
  });

  test("rejects other OpenAI-compatible hosts", () => {
    expect(isOpenRouterBaseUrl("https://api.openai.com/v1")).toBe(false);
    expect(isOpenRouterBaseUrl(null)).toBe(false);
    expect(isOpenRouterBaseUrl("")).toBe(false);
  });
});
