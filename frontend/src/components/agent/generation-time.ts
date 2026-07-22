import { VariantStatus } from "../commits/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatDurationMs(milliseconds: number): string {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatDurationBetween(
  startedAt: number | undefined,
  endedAt: number | undefined
): string {
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(endedAt)) return "";
  return formatDurationMs(Math.max(0, endedAt - startedAt));
}

export function isTerminalVariantStatus(
  status: VariantStatus | undefined
): status is Exclude<VariantStatus, "generating"> {
  return (
    status === "complete" || status === "error" || status === "cancelled"
  );
}

export function formatCompletedGenerationDuration(
  status: VariantStatus | undefined,
  requestStartedAt: number | undefined,
  completedAt: number | undefined
): string {
  if (!isTerminalVariantStatus(status)) return "";
  return formatDurationBetween(requestStartedAt, completedAt);
}
