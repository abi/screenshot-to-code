import { normalizeBabelCdn } from "./babelCdn";

const DEFAULT_TEMP_MD_API_URL = "https://api.temp.md";

export interface TempPreviewConnection {
  tempId: string;
  canonicalUrl: string;
  updateToken: string;
  expiresAt: string;
}

export class TempPreviewError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "TempPreviewError";
  }
}

interface PublishOptions {
  html: string;
  previous?: TempPreviewConnection | null;
  fetcher?: Fetcher;
  baseUrl?: string;
}

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export async function publishTempPreview({
  html,
  previous,
  fetcher = fetch,
  baseUrl = DEFAULT_TEMP_MD_API_URL,
}: PublishOptions): Promise<TempPreviewConnection> {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([normalizeBabelCdn(html)], { type: "text/html" }),
    "index.html"
  );

  const response = await fetcher(
    previous
      ? `${trimTrailingSlash(baseUrl)}/temps/${encodeURIComponent(previous.tempId)}`
      : `${trimTrailingSlash(baseUrl)}/temps`,
    {
      method: previous ? "PUT" : "POST",
      headers: previous
        ? { Authorization: `Bearer ${previous.updateToken}` }
        : undefined,
      body: formData,
    }
  );

  const body = await readJson(response);
  if (!response.ok) {
    throw new TempPreviewError(
      getErrorMessage(body) ?? `Publishing failed with status ${response.status}`,
      response.status
    );
  }

  const connection = parsePublishResponse(body, previous);
  if (!connection) {
    throw new TempPreviewError("temp.md returned an invalid response", response.status);
  }
  return connection;
}

export async function revokeTempPreview(
  connection: TempPreviewConnection,
  fetcher: Fetcher = fetch,
  baseUrl = DEFAULT_TEMP_MD_API_URL
): Promise<void> {
  const response = await fetcher(
    `${trimTrailingSlash(baseUrl)}/temps/${encodeURIComponent(connection.tempId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${connection.updateToken}` },
    }
  );

  if (response.ok || response.status === 404 || response.status === 410) return;

  const body = await readJson(response);
  throw new TempPreviewError(
    getErrorMessage(body) ?? `Removing the preview failed with status ${response.status}`,
    response.status
  );
}

export function isStaleTempPreviewError(error: unknown): boolean {
  return (
    error instanceof TempPreviewError &&
    [401, 403, 404, 410].includes(error.status)
  );
}

function parsePublishResponse(
  body: unknown,
  previous?: TempPreviewConnection | null
): TempPreviewConnection | null {
  if (!isRecord(body)) return null;

  const { tempId, canonicalUrl, expiresAt } = body;
  const updateToken = body.updateToken ?? previous?.updateToken;
  if (
    typeof tempId !== "string" ||
    typeof canonicalUrl !== "string" ||
    typeof updateToken !== "string" ||
    typeof expiresAt !== "string"
  ) {
    return null;
  }

  try {
    new URL(canonicalUrl);
  } catch {
    return null;
  }

  if (Number.isNaN(Date.parse(expiresAt))) return null;

  return { tempId, canonicalUrl, updateToken, expiresAt };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(body: unknown): string | null {
  if (!isRecord(body)) return null;
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
