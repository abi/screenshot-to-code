import toast from "react-hot-toast";
import { WS_BACKEND_URL } from "./config";
import {
  APP_ERROR_WEB_SOCKET_CODE,
  USER_CLOSE_WEB_SOCKET_CODE,
} from "./constants";
import { Stack } from "./lib/stacks";
import { FullGenerationSettings } from "./types";

const ERROR_MESSAGE =
  "Error starting generation. Check the browser console and backend logs for details. Make sure a Gemini key is configured if you are running locally.";

const CANCEL_MESSAGE = "Code generation cancelled";

type WebSocketResponse = {
  type:
    | "chunk"
    | "status"
    | "setCode"
    | "error"
    | "variantComplete"
    | "variantError"
    | "variantCount"
    | "variantModels"
    | "thinking"
    | "assistant"
    | "toolStart"
    | "toolResult";
  value?: string;
  data?: unknown;
  eventId?: string;
  variantIndex?: number;
};

interface CodeGenerationCallbacks {
  onChange: (chunk: string, variantIndex: number) => void;
  onSetCode: (code: string, variantIndex: number) => void;
  onStatusUpdate: (status: string, variantIndex: number) => void;
  onVariantComplete: (variantIndex: number) => void;
  onVariantError: (variantIndex: number, error: string) => void;
  onVariantCount: (count: number) => void;
  onVariantModels: (models: string[]) => void;
  onThinking: (content: string, variantIndex: number, eventId?: string) => void;
  onAssistant: (content: string, variantIndex: number, eventId?: string) => void;
  onToolStart: (data: unknown, variantIndex: number, eventId?: string) => void;
  onToolResult: (data: unknown, variantIndex: number, eventId?: string) => void;
  onCancel: (
    reason: "user_cancelled" | "request_failed" | "connection_error",
    errorMessage?: string
  ) => void;
  onComplete: () => void;
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GEMINI_REQUEST_TIMEOUT_MS = 120_000;
const GEMINI_IMAGE_MAX_DIMENSION = 1600;
const GEMINI_IMAGE_JPEG_QUALITY = 0.82;

function extractCodeFromResponse(text: string): string {
  const fenced = text.match(/```(?:html|tsx|jsx|vue|css)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] || text).trim();
}

function getStackInstruction(stack: Stack): string {
  switch (stack) {
    case Stack.REACT_TAILWIND:
      return "Return a single React component file written in TSX with Tailwind classes. Do not include extra explanation.";
    case Stack.VUE_TAILWIND:
      return "Return a single Vue SFC using Tailwind classes. Do not include extra explanation.";
    case Stack.BOOTSTRAP:
      return "Return a single HTML file that uses Bootstrap classes. Do not include extra explanation.";
    case Stack.IONIC_TAILWIND:
      return "Return a single TSX file for Ionic React using Tailwind classes where appropriate. Do not include extra explanation.";
    case Stack.HTML_CSS:
      return "Return a single self-contained HTML file with embedded CSS and JS when needed. Do not include extra explanation.";
    case Stack.HTML_TAILWIND:
    default:
      return "Return a single self-contained HTML file that uses Tailwind via CDN. Do not include extra explanation.";
  }
}

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
}

async function resizeImageDataUrl(dataUrl: string): Promise<string> {
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = dataUrl;
  });

  const originalWidth = source.naturalWidth || source.width;
  const originalHeight = source.naturalHeight || source.height;
  if (!originalWidth || !originalHeight) {
    throw new Error("Image has invalid dimensions.");
  }

  const ratio = Math.min(
    1,
    GEMINI_IMAGE_MAX_DIMENSION / Math.max(originalWidth, originalHeight)
  );
  const targetWidth = Math.max(1, Math.round(originalWidth * ratio));
  const targetHeight = Math.max(1, Math.round(originalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process image in browser.");
  }

  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", GEMINI_IMAGE_JPEG_QUALITY);
}

function extractGeminiText(json: unknown): string {
  if (!json || typeof json !== "object") {
    throw new Error("Gemini returned an invalid response.");
  }

  const parsed = json as GeminiGenerateResponse;
  const candidate = parsed.candidates?.[0];
  const parts = candidate?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error("Gemini did not return content parts.");
  }

  const text = parts
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

function shouldUseDirectGeminiFallback(params: FullGenerationSettings): boolean {
  return Boolean(params.geminiApiKey?.trim());
}

async function runDirectGeminiGeneration(
  params: FullGenerationSettings,
  callbacks: CodeGenerationCallbacks
): Promise<void> {
  const apiKey = params.geminiApiKey;
  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }

  const model = "gemini-2.5-flash";
  const instruction = [
    "You are an expert frontend engineer.",
    getStackInstruction(params.generatedCodeConfig),
    "Match the provided screenshot or prompt as closely as possible.",
    "Make the output responsive and production-like.",
    "Return only the code for the requested file.",
  ].join(" ");

  const userTextParts: string[] = [];
  if (params.generationType === "update") {
    userTextParts.push("Update the existing implementation based on the user's request.");
    if (params.fileState?.content) {
      userTextParts.push("Current code:");
      userTextParts.push(params.fileState.content);
    }
  } else {
    userTextParts.push("Create a fresh implementation from the provided input.");
  }

  if (params.prompt.text?.trim()) {
    userTextParts.push(`User request: ${params.prompt.text.trim()}`);
  }

  if (!params.prompt.text?.trim() && params.prompt.images.length > 0) {
    userTextParts.push("Recreate the provided screenshot as code.");
  }

  callbacks.onVariantCount(1);
  callbacks.onVariantModels([model]);

  try {
    callbacks.onStatusUpdate("Preparing image…", 0);
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: `${instruction}\n\n${userTextParts.join("\n\n")}` },
    ];

    const firstImage = params.prompt.images[0];
    if (firstImage) {
      const resizedImageDataUrl = await resizeImageDataUrl(firstImage);
      const inlineData = dataUrlToInlineData(resizedImageDataUrl);
      if (!inlineData) {
        throw new Error("Could not prepare image for Gemini.");
      }
      parts.push({ inlineData });
    }

    callbacks.onStatusUpdate("Sending request…", 0);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts,
              },
            ],
            generationConfig: {
              temperature: 0.2,
            },
          }),
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(
          `Gemini request timed out after ${Math.round(
            GEMINI_REQUEST_TIMEOUT_MS / 1000
          )} seconds. Please try again.`
        );
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new Error("Gemini returned a non-JSON response.");
    }

    if (!response.ok) {
      const errorMessage =
        json && typeof json === "object" && "error" in json
          ? ((json as GeminiGenerateResponse).error?.message ?? "Gemini request failed.")
          : "Gemini request failed.";
      throw new Error(errorMessage);
    }

    callbacks.onStatusUpdate("Finishing generation…", 0);
    const text = extractGeminiText(json);
    const code = extractCodeFromResponse(text);
    callbacks.onSetCode(code, 0);
    callbacks.onVariantComplete(0);
    callbacks.onComplete();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Direct Gemini generation failed.";
    console.error("Direct Gemini fallback failed", error);
    toast.error(message);
    callbacks.onStatusUpdate(
      message.toLowerCase().includes("timed out")
        ? "Request timed out."
        : "Generation failed.",
      0
    );
    callbacks.onCancel("request_failed", message);
  }
}

export function generateCode(
  wsRef: React.MutableRefObject<WebSocket | null>,
  params: FullGenerationSettings,
  callbacks: CodeGenerationCallbacks
) {
  const getModels = (data: unknown): string[] => {
    if (!data || typeof data !== "object" || !("models" in data)) {
      return [];
    }
    const models = (data as { models?: unknown }).models;
    return Array.isArray(models)
      ? models.filter((model): model is string => typeof model === "string")
      : [];
  };

  const parseResponse = (raw: string): WebSocketResponse | null => {
    try {
      const parsed = JSON.parse(raw) as Partial<WebSocketResponse>;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.type !== "string"
      ) {
        return null;
      }
      return parsed as WebSocketResponse;
    } catch (error) {
      console.error("Failed to parse websocket response", error, raw);
      return null;
    }
  };

  let didFallback = false;
  let receivedAnyMessage = false;

  const startDirectFallback = () => {
    if (didFallback) {
      return;
    }
    didFallback = true;
    wsRef.current = null;
    void runDirectGeminiGeneration(params, callbacks);
  };

  const wsUrl = `${WS_BACKEND_URL}/generate-code`;
  console.log("Connecting to backend @ ", wsUrl);

  const ws = new WebSocket(wsUrl);
  wsRef.current = ws;

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify(params));
  });

  ws.addEventListener("message", async (event: MessageEvent) => {
    receivedAnyMessage = true;
    const response = parseResponse(event.data);
    if (!response) {
      toast.error(ERROR_MESSAGE);
      callbacks.onCancel("request_failed", ERROR_MESSAGE);
      return;
    }
    const variantIndex = typeof response.variantIndex === "number" ? response.variantIndex : 0;
    if (response.type === "chunk") {
      callbacks.onChange(response.value || "", variantIndex);
    } else if (response.type === "status") {
      callbacks.onStatusUpdate(response.value || "", variantIndex);
    } else if (response.type === "setCode") {
      callbacks.onSetCode(response.value || "", variantIndex);
    } else if (response.type === "variantComplete") {
      callbacks.onVariantComplete(variantIndex);
    } else if (response.type === "variantError") {
      callbacks.onVariantError(variantIndex, response.value || "");
    } else if (response.type === "variantCount") {
      callbacks.onVariantCount(parseInt(response.value || "1"));
    } else if (response.type === "variantModels") {
      callbacks.onVariantModels(getModels(response.data));
    } else if (response.type === "thinking") {
      callbacks.onThinking(response.value || "", variantIndex, response.eventId);
    } else if (response.type === "assistant") {
      callbacks.onAssistant(response.value || "", variantIndex, response.eventId);
    } else if (response.type === "toolStart") {
      callbacks.onToolStart(response.data, variantIndex, response.eventId);
    } else if (response.type === "toolResult") {
      callbacks.onToolResult(response.data, variantIndex, response.eventId);
    } else if (response.type === "error") {
      console.error("Error generating code", response.value);
      toast.error(response.value || ERROR_MESSAGE);
    }
  });

  ws.addEventListener("close", (event) => {
    console.log("Connection closed", event.code, event.reason);
    if (!receivedAnyMessage && shouldUseDirectGeminiFallback(params)) {
      startDirectFallback();
      return;
    }
    if (event.code === USER_CLOSE_WEB_SOCKET_CODE) {
      toast.success(CANCEL_MESSAGE);
      callbacks.onCancel("user_cancelled");
    } else if (event.code === APP_ERROR_WEB_SOCKET_CODE) {
      console.error("Known server error", event);
      callbacks.onCancel("request_failed", event.reason || ERROR_MESSAGE);
    } else if (event.code !== 1000) {
      console.error("Unknown server or connection error", event);
      toast.error(ERROR_MESSAGE);
      callbacks.onCancel("connection_error", event.reason || ERROR_MESSAGE);
    } else {
      callbacks.onComplete();
    }
  });

  ws.addEventListener("error", (error) => {
    console.error("WebSocket error", error);
    if (!receivedAnyMessage && shouldUseDirectGeminiFallback(params)) {
      startDirectFallback();
      return;
    }
    toast.error(ERROR_MESSAGE);
  });
}
