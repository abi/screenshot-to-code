import { HTTP_BACKEND_URL } from "../config";
import { DesignSystem } from "../types";

type DesignSystemsRequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface DesignSystemPayload {
  name: string;
  content: string;
}

export interface DesignSystemsRequestOptions {
  method?: DesignSystemsRequestMethod;
  body?: unknown;
}

export type DesignSystemsRequest = <T>(
  path: string,
  options?: DesignSystemsRequestOptions
) => Promise<T>;

export interface DesignSystemsClient {
  fetchDesignSystems: () => Promise<DesignSystem[]>;
  createDesignSystem: (payload: DesignSystemPayload) => Promise<DesignSystem>;
  updateDesignSystem: (
    id: string,
    payload: Partial<DesignSystemPayload>
  ) => Promise<DesignSystem>;
  deleteDesignSystem: (id: string) => Promise<void>;
}

export const NEW_DESIGN_SYSTEM_CONTENT = "";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to update design systems");
  }

  return response.json() as Promise<T>;
}

function getDesignSystemUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function createHttpDesignSystemsRequest(
  baseUrl = HTTP_BACKEND_URL,
  fetcher: typeof fetch = fetch
): DesignSystemsRequest {
  return async <T>(path: string, options: DesignSystemsRequestOptions = {}) => {
    const { method = "GET", body } = options;
    const response = await fetcher(getDesignSystemUrl(baseUrl, path), {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) {
      return undefined as T;
    }

    return parseJsonResponse<T>(response);
  };
}

export function createDesignSystemsClient(
  request: DesignSystemsRequest
): DesignSystemsClient {
  return {
    fetchDesignSystems: () => request<DesignSystem[]>("/api/design-systems"),
    createDesignSystem: (payload: DesignSystemPayload) =>
      request<DesignSystem>("/api/design-systems", {
        method: "POST",
        body: payload,
      }),
    updateDesignSystem: (
      id: string,
      payload: Partial<DesignSystemPayload>
    ) =>
      request<DesignSystem>(`/api/design-systems/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    deleteDesignSystem: (id: string) =>
      request<void>(`/api/design-systems/${id}`, {
        method: "DELETE",
      }),
  };
}

export const defaultDesignSystemsClient = createDesignSystemsClient(
  createHttpDesignSystemsRequest()
);

export async function fetchDesignSystems(): Promise<DesignSystem[]> {
  return defaultDesignSystemsClient.fetchDesignSystems();
}

export async function createDesignSystem(
  payload: DesignSystemPayload
): Promise<DesignSystem> {
  return defaultDesignSystemsClient.createDesignSystem(payload);
}

export async function updateDesignSystem(
  id: string,
  payload: Partial<DesignSystemPayload>
): Promise<DesignSystem> {
  return defaultDesignSystemsClient.updateDesignSystem(id, payload);
}

export async function deleteDesignSystem(id: string): Promise<void> {
  return defaultDesignSystemsClient.deleteDesignSystem(id);
}
