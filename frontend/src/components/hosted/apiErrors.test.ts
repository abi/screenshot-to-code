import { getApiErrorMessage } from "./apiErrors";

function buildResponse(body: string, status = 400, statusText = "Bad Request") {
  return {
    status,
    statusText,
    text: jest.fn().mockResolvedValue(body),
  };
}

describe("getApiErrorMessage", () => {
  test("returns detail from a JSON error payload", async () => {
    const response = buildResponse(
      JSON.stringify({ detail: "Subscriptions scheduled for cancellation must use billing management first" }),
    );

    await expect(getApiErrorMessage(response)).resolves.toBe(
      "Subscriptions scheduled for cancellation must use billing management first",
    );
  });

  test("falls back to the HTTP status when the body is not JSON", async () => {
    const response = buildResponse("bad gateway", 502, "Bad Gateway");

    await expect(getApiErrorMessage(response)).resolves.toBe(
      "HTTP error 502: Bad Gateway",
    );
  });
});
