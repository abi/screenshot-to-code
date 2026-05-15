import { HTTP_BACKEND_URL } from "../config";
import { DesignSystem } from "../types";

export interface DesignSystemPayload {
  name: string;
  content: string;
}

export const NEW_DESIGN_SYSTEM_CONTENT = "";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to update design systems");
  }

  return response.json() as Promise<T>;
}

export async function fetchDesignSystems(): Promise<DesignSystem[]> {
  const response = await fetch(`${HTTP_BACKEND_URL}/api/design-systems`);
  return parseJsonResponse<DesignSystem[]>(response);
}

export async function createDesignSystem(
  payload: DesignSystemPayload
): Promise<DesignSystem> {
  const response = await fetch(`${HTTP_BACKEND_URL}/api/design-systems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<DesignSystem>(response);
}

export async function updateDesignSystem(
  id: string,
  payload: Partial<DesignSystemPayload>
): Promise<DesignSystem> {
  const response = await fetch(`${HTTP_BACKEND_URL}/api/design-systems/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<DesignSystem>(response);
}

export async function deleteDesignSystem(id: string): Promise<void> {
  const response = await fetch(`${HTTP_BACKEND_URL}/api/design-systems/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to delete design system");
  }
}
