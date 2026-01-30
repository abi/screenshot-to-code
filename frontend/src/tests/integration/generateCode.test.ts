import { generateCode } from "../../generateCode";
import {
  MockWebSocket,
  installMockWebSocket,
} from "../mocks/mockWebSocket";
import {
  SIMPLE_BUTTON_HTML,
  createCodeGenerationMessages,
  createErrorMessages,
} from "../mocks/fixtures";

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock config to use test URL
jest.mock("../../config", () => ({
  WS_BACKEND_URL: "ws://localhost:7001",
}));

describe("generateCode", () => {
  let cleanupWebSocket: () => void;
  let wsRef: React.MutableRefObject<WebSocket | null>;
  let callbacks: {
    onChange: jest.Mock;
    onSetCode: jest.Mock;
    onStatusUpdate: jest.Mock;
    onVariantComplete: jest.Mock;
    onVariantError: jest.Mock;
    onVariantCount: jest.Mock;
    onThinking: jest.Mock;
    onCancel: jest.Mock;
    onComplete: jest.Mock;
  };

  beforeEach(() => {
    cleanupWebSocket = installMockWebSocket();
    wsRef = { current: null };
    callbacks = {
      onChange: jest.fn(),
      onSetCode: jest.fn(),
      onStatusUpdate: jest.fn(),
      onVariantComplete: jest.fn(),
      onVariantError: jest.fn(),
      onVariantCount: jest.fn(),
      onThinking: jest.fn(),
      onCancel: jest.fn(),
      onComplete: jest.fn(),
    };
  });

  afterEach(() => {
    cleanupWebSocket();
    jest.clearAllMocks();
  });

  const defaultParams = {
    generationType: "create" as const,
    image: "data:image/png;base64,test",
    inputMode: "image" as const,
    openAiApiKey: "test-key",
    generatedCodeConfig: "html_tailwind" as const,
    codeGenerationModel: "claude_4_sonnet" as const,
    isImageGenerationEnabled: false,
  };

  it("connects to WebSocket and sends params on open", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    expect(ws).toBeDefined();
    expect(ws?.url).toBe("ws://localhost:7001/generate-code");

    // Simulate WebSocket open
    let sentData: string | undefined;
    ws!.send = jest.fn((data) => {
      sentData = data;
    });

    ws?.simulateOpen();

    // Wait for the send to be called
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ws?.send).toHaveBeenCalled();
    expect(sentData).toBeDefined();
    const parsedData = JSON.parse(sentData!);
    expect(parsedData.generationType).toBe("create");
    expect(parsedData.inputMode).toBe("image");
  });

  it("handles code chunks and calls onChange", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    // Simulate receiving chunks
    ws?.simulateMessage({ type: "chunk", value: "<html>", variantIndex: 0 });
    ws?.simulateMessage({ type: "chunk", value: "<body>", variantIndex: 0 });
    ws?.simulateMessage({ type: "chunk", value: "</body></html>", variantIndex: 0 });

    expect(callbacks.onChange).toHaveBeenCalledTimes(3);
    expect(callbacks.onChange).toHaveBeenNthCalledWith(1, "<html>", 0);
    expect(callbacks.onChange).toHaveBeenNthCalledWith(2, "<body>", 0);
    expect(callbacks.onChange).toHaveBeenNthCalledWith(3, "</body></html>", 0);
  });

  it("handles status updates", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({ type: "status", value: "Generating code...", variantIndex: 0 });

    expect(callbacks.onStatusUpdate).toHaveBeenCalledWith("Generating code...", 0);
  });

  it("handles setCode message", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({ type: "setCode", value: SIMPLE_BUTTON_HTML, variantIndex: 0 });

    expect(callbacks.onSetCode).toHaveBeenCalledWith(SIMPLE_BUTTON_HTML, 0);
  });

  it("handles variantComplete message", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({ type: "variantComplete", value: "", variantIndex: 0 });

    expect(callbacks.onVariantComplete).toHaveBeenCalledWith(0);
  });

  it("handles variantCount message", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({ type: "variantCount", value: "3", variantIndex: 0 });

    expect(callbacks.onVariantCount).toHaveBeenCalledWith(3);
  });

  it("handles variantError message", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({
      type: "variantError",
      value: "API rate limit exceeded",
      variantIndex: 0,
    });

    expect(callbacks.onVariantError).toHaveBeenCalledWith(0, "API rate limit exceeded");
  });

  it("handles thinking message", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({
      type: "thinking",
      value: "Analyzing the screenshot...",
      variantIndex: 0,
    });

    expect(callbacks.onThinking).toHaveBeenCalledWith("Analyzing the screenshot...", 0);
  });

  it("handles error message and shows toast", async () => {
    const toast = require("react-hot-toast");
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    ws?.simulateMessage({ type: "error", value: "Invalid API key", variantIndex: 0 });

    expect(toast.error).toHaveBeenCalledWith("Invalid API key");
  });

  it("calls onComplete when connection closes normally", async () => {
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();
    ws?.simulateClose(1000);

    expect(callbacks.onComplete).toHaveBeenCalled();
    expect(callbacks.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when user closes connection", async () => {
    const toast = require("react-hot-toast");
    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();
    ws?.simulateClose(4333); // USER_CLOSE_WEB_SOCKET_CODE from constants.ts

    expect(callbacks.onCancel).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Code generation cancelled");
  });

  it("handles full code generation flow", async () => {
    const messages = createCodeGenerationMessages(SIMPLE_BUTTON_HTML, 50);

    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    // Simulate all messages
    await ws?.simulateMessages(messages, 1);
    ws?.simulateClose(1000);

    // Verify variant count was received
    expect(callbacks.onVariantCount).toHaveBeenCalledWith(1);

    // Verify status was received
    expect(callbacks.onStatusUpdate).toHaveBeenCalledWith("Generating code...", 0);

    // Verify chunks were received (code is chunked)
    expect(callbacks.onChange).toHaveBeenCalled();

    // Verify variant completion
    expect(callbacks.onVariantComplete).toHaveBeenCalledWith(0);

    // Verify onComplete was called
    expect(callbacks.onComplete).toHaveBeenCalled();
  });

  it("handles error flow", async () => {
    const messages = createErrorMessages("API key is invalid");

    generateCode(wsRef, defaultParams, callbacks);

    const ws = MockWebSocket.getLastInstance();
    ws?.simulateOpen();

    await ws?.simulateMessages(messages, 1);

    expect(callbacks.onVariantError).toHaveBeenCalledWith(0, "API key is invalid");
  });

  it("stores WebSocket reference in wsRef", () => {
    generateCode(wsRef, defaultParams, callbacks);

    expect(wsRef.current).toBeDefined();
    expect(wsRef.current).toBeInstanceOf(MockWebSocket);
  });
});
