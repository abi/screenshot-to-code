import type { Commit } from "../commits/types";
import type { TempPreviewConnection } from "../../lib/tempPreview";

const STORAGE_KEY = "screenshot-to-code.temp-previews.v1";

export function getProjectKey(
  commits: Record<string, Commit>,
  head: string | null
): string | null {
  if (!head || !commits[head]) return null;

  let current = commits[head];
  const visited = new Set<string>();
  while (current.parentHash && commits[current.parentHash]) {
    if (visited.has(current.hash)) return null;
    visited.add(current.hash);
    current = commits[current.parentHash];
  }
  return current.hash;
}

export function loadTempPreview(
  projectKey: string,
  storage: Storage = window.localStorage
): TempPreviewConnection | null {
  const records = readRecords(storage);
  return records[projectKey] ?? null;
}

export function saveTempPreview(
  projectKey: string,
  connection: TempPreviewConnection,
  storage: Storage = window.localStorage
): void {
  const records = readRecords(storage);
  records[projectKey] = connection;
  storage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function removeTempPreview(
  projectKey: string,
  storage: Storage = window.localStorage
): void {
  const records = readRecords(storage);
  delete records[projectKey];
  storage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function readRecords(storage: Storage): Record<string, TempPreviewConnection> {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, TempPreviewConnection] =>
          isTempPreviewConnection(entry[1])
      )
    );
  } catch {
    return {};
  }
}

function isTempPreviewConnection(value: unknown): value is TempPreviewConnection {
  return (
    isRecord(value) &&
    typeof value.tempId === "string" &&
    typeof value.canonicalUrl === "string" &&
    typeof value.updateToken === "string" &&
    typeof value.expiresAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
