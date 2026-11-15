/**
 * useWebSocketReconnect — React hook for WebSocket connections with automatic
 * reconnection on unexpected disconnection.
 *
 * Features:
 *   - Exponential back-off between reconnect attempts (base 1 s, cap 30 s)
 *   - Resets back-off on successful connection
 *   - Fires optional `onDisconnect` callback so callers can react (e.g., show UI)
 *   - Cleans up on unmount
 *
 * Usage:
 *   const { send, status } = useWebSocketReconnect({
 *     url: "ws://localhost:7001/generate-code",
 *     onDisconnect: () => setDisconnected(true),
 *   });
 *
 *   status === "connected"  → socket is open, send() is safe
 *   status === "connecting" → attempting to reconnect
 *   status === "disconnected" → all retries exhausted (or not started)
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketStatus =
  | "disconnected"
  | "connecting"
  | "connected";

interface UseWebSocketReconnectOptions {
  /** WebSocket URL to connect to */
  url: string;
  /** Maximum reconnection attempts before giving up (default: 10) */
  maxRetries?: number;
  /** Base delay in ms for exponential back-off (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Called when the connection is unexpectedly closed */
  onDisconnect?: () => void;
  /** Called when a connection is successfully established */
  onConnect?: () => void;
  /** Custom WebSocket constructor (useful for testing, default: window.WebSocket) */
  WebSocketCtor?: typeof WebSocket;
}

interface UseWebSocketReconnectReturn {
  /** Current connection status */
  status: WebSocketStatus;
  /** Number of reconnect attempts made so far */
  retryCount: number;
  /** Send a JSON-serialisable message. No-op when disconnected. */
  send: (data: unknown) => void;
  /** Manually trigger a reconnection attempt */
  reconnect: () => void;
  /** Permanently close the socket and stop retrying */
  disconnect: () => void;
}

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;

export function useWebSocketReconnect({
  url,
  maxRetries = DEFAULT_MAX_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  onDisconnect,
  onConnect,
  WebSocketCtor = window.WebSocket,
}: UseWebSocketReconnectOptions): UseWebSocketReconnectReturn {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [retryCount, setRetryCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionallyClosedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionallyClosedRef.current = true;
    clearTimer();
    if (socketRef.current !== null) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus("disconnected");
  }, [clearTimer]);

  const connect = useCallback(() => {
    if (intentionallyClosedRef.current) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    clearTimer();
    setStatus("connecting");

    const ws = new WebSocketCtor(url);
    socketRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      setRetryCount(0);
      setStatus("connected");
      onConnect?.();
    };

    ws.onclose = () => {
      if (intentionallyClosedRef.current) return;

      const attempts = retryCountRef.current + 1;
      if (attempts > maxRetries) {
        setStatus("disconnected");
        onDisconnect?.();
        return;
      }

      retryCountRef.current = attempts;
      setRetryCount(attempts);
      setStatus("connecting");

      // Exponential back-off with jitter
      const delay = Math.min(
        baseDelayMs * 2 ** (attempts - 1) + Math.random() * 500,
        maxDelayMs
      );

      timerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; handle everything there.
    };
  }, [url, maxRetries, baseDelayMs, maxDelayMs, clearTimer, onDisconnect, onConnect]);

  // Auto-connect on mount
  useEffect(() => {
    intentionallyClosedRef.current = false;
    connect();

    return () => {
      disconnect();
    };
    // connect is stable (useCallback); intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disconnect]);

  const send = useCallback((data: unknown) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    intentionallyClosedRef.current = false;
    retryCountRef.current = 0;
    setRetryCount(0);
    connect();
  }, [disconnect, connect]);

  return { status, retryCount, send, reconnect, disconnect };
}
