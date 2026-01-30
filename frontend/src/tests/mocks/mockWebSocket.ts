import { WebSocketMessage } from "./fixtures";

type WebSocketEventType = "open" | "message" | "close" | "error";

interface MockWebSocketOptions {
  onSend?: (data: string) => void;
}

// Mock WebSocket class for testing
export class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = WebSocket.CONNECTING;
  private listeners: Record<WebSocketEventType, Array<(event: unknown) => void>> = {
    open: [],
    message: [],
    close: [],
    error: [],
  };
  private onSend?: (data: string) => void;

  constructor(url: string, options?: MockWebSocketOptions) {
    this.url = url;
    this.onSend = options?.onSend;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: WebSocketEventType, listener: (event: unknown) => void) {
    this.listeners[type].push(listener);
  }

  removeEventListener(type: WebSocketEventType, listener: (event: unknown) => void) {
    const index = this.listeners[type].indexOf(listener);
    if (index > -1) {
      this.listeners[type].splice(index, 1);
    }
  }

  send(data: string) {
    if (this.onSend) {
      this.onSend(data);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent("close", { code: code || 1000, reason: reason || "" });
  }

  // Test helpers
  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent("open", {});
  }

  simulateMessage(data: WebSocketMessage) {
    this.dispatchEvent("message", { data: JSON.stringify(data) });
  }

  simulateMessages(messages: WebSocketMessage[], delayMs: number = 10): Promise<void> {
    return new Promise((resolve) => {
      let index = 0;
      const sendNext = () => {
        if (index < messages.length) {
          this.simulateMessage(messages[index]);
          index++;
          setTimeout(sendNext, delayMs);
        } else {
          resolve();
        }
      };
      sendNext();
    });
  }

  simulateError(error: Error) {
    this.dispatchEvent("error", error);
  }

  simulateClose(code: number = 1000, reason: string = "") {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent("close", { code, reason });
  }

  private dispatchEvent(type: WebSocketEventType, event: unknown) {
    this.listeners[type].forEach((listener) => listener(event));
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

// Helper to install MockWebSocket globally
export function installMockWebSocket(): () => void {
  const originalWebSocket = global.WebSocket;

  // @ts-expect-error - intentionally replacing WebSocket
  global.WebSocket = MockWebSocket;

  return () => {
    global.WebSocket = originalWebSocket;
    MockWebSocket.reset();
  };
}

// Helper for creating a mock WebSocket that auto-responds with messages
export function createAutoRespondingWebSocket(
  messages: WebSocketMessage[],
  delayMs: number = 10
): typeof MockWebSocket {
  class AutoRespondingWebSocket extends MockWebSocket {
    constructor(url: string) {
      super(url);

      // Auto-open after construction
      setTimeout(() => {
        this.simulateOpen();
      }, 0);
    }

    send(data: string) {
      super.send(data);
      // After receiving the initial params, start sending messages
      setTimeout(async () => {
        await this.simulateMessages(messages, delayMs);
        this.simulateClose(1000);
      }, delayMs);
    }
  }

  return AutoRespondingWebSocket as unknown as typeof MockWebSocket;
}
