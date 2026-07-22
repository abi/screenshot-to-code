function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getStringArrayField(value: unknown, field: string): string[] {
  const fieldValue = getRecord(value)?.[field];
  if (!Array.isArray(fieldValue)) return [];
  return fieldValue.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

/**
 * Completed tool events contain a compact output summary, so its source URLs
 * may end in "..." and are not safe to render. The tool input retains the
 * original URLs. Fall back to the output for older events without input data.
 */
export function getEditImageSourceUrls(
  input: unknown,
  output: unknown
): string[] {
  const inputUrls = getStringArrayField(input, "image_urls");
  if (inputUrls.length > 0) return inputUrls;

  return getStringArrayField(getRecord(output)?.image, "image_urls");
}
