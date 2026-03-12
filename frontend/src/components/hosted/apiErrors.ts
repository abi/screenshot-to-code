export const GENERIC_API_ERROR_PREFIX = "HTTP error";

export async function getApiErrorMessage(
  response: Pick<Response, "status" | "statusText" | "text">,
): Promise<string> {
  const fallbackMessage = `${GENERIC_API_ERROR_PREFIX} ${response.status}: ${response.statusText}`;

  let responseText = "";
  try {
    responseText = await response.text();
  } catch {
    return fallbackMessage;
  }

  if (!responseText) {
    return fallbackMessage;
  }

  try {
    const parsedResponse = JSON.parse(responseText) as {
      detail?: unknown;
      message?: unknown;
    };
    if (
      typeof parsedResponse.detail === "string"
      && parsedResponse.detail.trim().length > 0
    ) {
      return parsedResponse.detail;
    }
    if (
      typeof parsedResponse.message === "string"
      && parsedResponse.message.trim().length > 0
    ) {
      return parsedResponse.message;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}
