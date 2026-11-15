// Custom provider configuration — stored in localStorage and sent over WebSocket

const STORAGE_KEY = "customProviders";

export interface CustomProvider {
  /** Stable uuid used as the React key */
  id: string;
  /** Display name chosen by the user */
  name: string;
  /** OpenAI-compatible base URL, e.g. http://localhost:11434/v1 */
  baseUrl: string;
  /** API key — may be empty for servers that don't require one */
  apiKey: string;
  /** Model ID selected from the fetched model list */
  modelId: string;
  /** Whether this provider is included in generation */
  enabled: boolean;
}

export interface FetchedModel {
  id: string;
}

/** Read custom providers from localStorage. Returns [] if nothing is stored. */
export function loadCustomProviders(): CustomProvider[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomProvider[];
  } catch {
    return [];
  }
}

/** Persist custom providers to localStorage. */
export function saveCustomProviders(providers: CustomProvider[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}
