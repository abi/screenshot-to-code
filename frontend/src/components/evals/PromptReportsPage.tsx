import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Markdown from "react-markdown";

import { HTTP_BACKEND_URL } from "../../config";
import EvalNavigation from "./EvalNavigation";

interface PromptReportSummary {
  filename: string;
  provider: string;
  model: string;
  created_at: string;
  session_id: string;
  turn: number;
  size_bytes: number;
  cost_usd: number | null;
}

interface PromptReportListResponse {
  reports: PromptReportSummary[];
  total_size_bytes: number;
  reports_directory: string;
}

interface PromptReportUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_write: number;
  total_tokens: number;
  cache_hit_rate_percent: number;
  cost_usd: number | null;
}

interface PromptReportContent {
  provider: string;
  model: string;
  api_model_name: string;
  session_id: string;
  turn: number;
  created_at: string;
  request: unknown;
  usage: PromptReportUsage | null;
}

interface SessionGroup {
  sessionId: string;
  provider: string;
  model: string;
  createdAt: string;
  sizeBytes: number;
  costUsd: number | null;
  turns: PromptReportSummary[];
}

const PROVIDER_BADGE_CLASSES: Record<string, string> = {
  openai: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
  anthropic: "bg-orange-900/60 text-orange-200 border-orange-700",
  gemini: "bg-sky-900/60 text-sky-200 border-sky-700",
};

function providerBadgeClass(provider: string): string {
  return (
    PROVIDER_BADGE_CLASSES[provider] ||
    "bg-zinc-800 text-zinc-200 border-zinc-600"
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleString();
}

function formatCost(costUsd: number | null): string {
  if (costUsd === null) return "—";
  if (costUsd > 0 && costUsd < 0.01) return "<$0.01";
  return `$${costUsd.toFixed(costUsd < 1 ? 4 : 2)}`;
}

function groupBySession(reports: PromptReportSummary[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const report of reports) {
    let group = groups.get(report.session_id);
    if (!group) {
      group = {
        sessionId: report.session_id,
        provider: report.provider,
        model: report.model,
        createdAt: report.created_at,
        sizeBytes: 0,
        costUsd: null,
        turns: [],
      };
      groups.set(report.session_id, group);
    }
    group.sizeBytes += report.size_bytes;
    if (typeof report.cost_usd === "number") {
      group.costUsd = (group.costUsd ?? 0) + report.cost_usd;
    }
    if (report.created_at > group.createdAt) {
      group.createdAt = report.created_at;
    }
    group.turns.push(report);
  }
  const result = [...groups.values()];
  for (const group of result) {
    group.turns.sort((a, b) => a.turn - b.turn);
  }
  result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return result;
}

interface MediaInfo {
  src: string;
  kind: "image" | "video";
}

// Pydantic's JSON mode emits URL-safe base64; data: URLs need the standard
// alphabet. Normalize so reports written before the writer fix still render.
function normalizeBase64(data: string): string {
  return data.replace(/-/g, "+").replace(/_/g, "/");
}

// Detects renderable media in a JSON value: either a data URL string or an
// object shaped like {data: <base64>, mime_type|media_type: image/*|video/*}.
function mediaFromValue(value: unknown): MediaInfo | null {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return { src: value, kind: "image" };
    if (value.startsWith("data:video/")) return { src: value, kind: "video" };
    return null;
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const mime = record["mime_type"] ?? record["media_type"];
    const data = record["data"];
    if (
      typeof mime === "string" &&
      typeof data === "string" &&
      data.length > 0
    ) {
      if (mime.startsWith("image/") || mime.startsWith("video/")) {
        return {
          src: `data:${mime};base64,${normalizeBase64(data)}`,
          kind: mime.startsWith("image/") ? "image" : "video",
        };
      }
    }
  }

  return null;
}

function MediaPreview({ media }: { media: MediaInfo }) {
  if (media.kind === "video") {
    return (
      <video
        src={media.src}
        controls
        className="my-1 max-h-48 rounded-lg border border-zinc-700"
      />
    );
  }
  return (
    <a href={media.src} target="_blank" rel="noreferrer">
      <img
        src={media.src}
        alt="embedded media"
        className="my-1 max-h-48 rounded-lg border border-zinc-700 bg-white object-contain"
      />
    </a>
  );
}

function nodeSummary(value: unknown): string {
  if (Array.isArray(value)) {
    return `array · ${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object" && value !== null) {
    const keyCount = Object.keys(value).length;
    return `object · ${keyCount} key${keyCount === 1 ? "" : "s"}`;
  }
  return typeof value;
}

const LONG_STRING_PREVIEW_CHARS = 280;
const MARKDOWN_MAX_CHARS = 20000;
// Object keys whose string values are prompt/message prose — rendered as
// markdown instead of a raw string.
const PROSE_KEYS = new Set([
  "text",
  "content",
  "system",
  "system_instruction",
  "instructions",
]);

const MARKDOWN_STYLES = [
  "[&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-bold",
  "[&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-bold",
  "[&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_p]:my-1.5",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5",
  "[&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:text-[11px] [&_code]:text-amber-100",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-900 [&_pre]:p-2",
  "[&_a]:text-blue-400 [&_a]:underline",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400",
].join(" ");

function MarkdownLeaf({ text }: { text: string }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="min-w-0 flex-1">
      <div className="mt-1 max-h-96 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        {showRaw ? (
          <pre className="whitespace-pre-wrap break-all text-xs text-amber-100">
            {text}
          </pre>
        ) : (
          <div className={`text-xs leading-5 text-zinc-200 ${MARKDOWN_STYLES}`}>
            <Markdown>{text}</Markdown>
          </div>
        )}
      </div>
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="mt-1 text-xs text-blue-400 hover:text-blue-300"
      >
        {showRaw ? "Show rendered" : "Show raw"}
      </button>
    </div>
  );
}

function StringLeaf({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= LONG_STRING_PREVIEW_CHARS) {
    return (
      <code className="whitespace-pre-wrap break-all rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-amber-100">
        {text}
      </code>
    );
  }

  return (
    <div className="min-w-0">
      <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-amber-100">
        {expanded ? text : `${text.slice(0, LONG_STRING_PREVIEW_CHARS)}…`}
      </pre>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-1 text-xs text-blue-400 hover:text-blue-300"
      >
        {expanded
          ? "Collapse"
          : `Show all ${text.length.toLocaleString()} chars`}
      </button>
    </div>
  );
}

function ScalarLeaf({ label, value }: { label: string; value: unknown }) {
  if (typeof value === "string") {
    if (
      PROSE_KEYS.has(label) &&
      value.length > 80 &&
      value.length <= MARKDOWN_MAX_CHARS
    ) {
      return <MarkdownLeaf text={value} />;
    }
    return <StringLeaf text={value} />;
  }
  return (
    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-teal-300">
      {value === null ? "null" : String(value)}
    </code>
  );
}

// Arrays under these keys hold tool definitions: collapse them by default and
// label each entry with the tool's name so the list scans as a name index.
const TOOL_ARRAY_KEYS = new Set(["tools", "function_declarations"]);

function toolEntryName(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const name = (value as Record<string, unknown>)["name"];
  return typeof name === "string" ? name : null;
}

function JsonNode({
  label,
  value,
  depth,
  defaultOpen,
}: {
  label: string;
  value: unknown;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 5);
  const media = mediaFromValue(value);
  const isContainer =
    typeof value === "object" && value !== null && !(media && !open);

  if (!isContainer || typeof value !== "object" || value === null) {
    return (
      <div className="flex min-w-0 items-start gap-2 py-0.5">
        <span className="shrink-0 font-mono text-xs text-violet-300">
          {label}:
        </span>
        {media ? (
          <MediaPreview media={media} />
        ) : (
          <ScalarLeaf label={label} value={value} />
        )}
      </div>
    );
  }

  const isToolArray = TOOL_ARRAY_KEYS.has(label) && Array.isArray(value);
  const entries: [string, unknown, boolean][] = Array.isArray(value)
    ? value.map((child, index) => {
        const toolName = isToolArray ? toolEntryName(child) : null;
        return [toolName ?? `[${index}]`, child, toolName !== null];
      })
    : Object.entries(value).map(([key, child]) => [key, child, false]);

  return (
    <div className="min-w-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-zinc-800/60"
      >
        <span className="w-3 text-xs text-zinc-500">{open ? "▾" : "▸"}</span>
        <span className="font-mono text-xs text-violet-300">{label}</span>
        <span className="font-mono text-xs text-blue-400">
          {nodeSummary(value)}
        </span>
      </button>
      {open && (
        <div className="ml-2 border-l border-zinc-800 pl-4">
          {media && <MediaPreview media={media} />}
          {entries.map(([childLabel, childValue, isTool]) => (
            <JsonNode
              key={childLabel}
              label={childLabel}
              value={childValue}
              depth={depth + 1}
              defaultOpen={isTool ? false : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UsagePanel({ usage }: { usage: PromptReportUsage }) {
  const metrics: [string, string][] = [
    ["Input tokens", usage.input_tokens.toLocaleString()],
    ["Output tokens", usage.output_tokens.toLocaleString()],
    ["Cache read", usage.cache_read.toLocaleString()],
    ["Cache write", usage.cache_write.toLocaleString()],
    ["Total tokens", usage.total_tokens.toLocaleString()],
    ["Cache hit rate", `${usage.cache_hit_rate_percent.toFixed(1)}%`],
    [
      "Cost",
      usage.cost_usd === null ? "n/a" : `$${usage.cost_usd.toFixed(4)}`,
    ],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {metrics.map(([metricLabel, metricValue]) => (
        <div
          key={metricLabel}
          className="rounded-lg border border-zinc-800 bg-zinc-950 p-2"
        >
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            {metricLabel}
          </div>
          <div className="mt-1 font-mono text-sm text-zinc-100">
            {metricValue}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromptReportsPage() {
  const [reports, setReports] = useState<PromptReportSummary[]>([]);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);
  const [reportsDirectory, setReportsDirectory] = useState("");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [content, setContent] = useState<PromptReportContent | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isPruning, setIsPruning] = useState(false);

  const sessionGroups = useMemo(() => groupBySession(reports), [reports]);

  const fetchReports = useCallback(async (): Promise<
    PromptReportSummary[]
  > => {
    setIsLoadingList(true);
    try {
      const response = await fetch(`${HTTP_BACKEND_URL}/prompt-reports`);
      const data: PromptReportListResponse = await response.json();
      setReports(data.reports);
      setTotalSizeBytes(data.total_size_bytes);
      setReportsDirectory(data.reports_directory);
      return data.reports;
    } catch (error) {
      console.error("Error fetching prompt reports", error);
      toast.error("Failed to load prompt reports.");
      return [];
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const openReport = useCallback(async (filename: string) => {
    setSelectedFilename(filename);
    setShowRawJson(false);
    setIsLoadingContent(true);
    try {
      const response = await fetch(
        `${HTTP_BACKEND_URL}/prompt-reports/content?filename=${encodeURIComponent(
          filename
        )}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Request failed");
      }
      setContent(await response.json());
    } catch (error) {
      console.error("Error fetching report content", error);
      setContent(null);
      toast.error("Failed to load report.");
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    fetchReports().then((loadedReports) => {
      if (loadedReports.length > 0) {
        const groups = groupBySession(loadedReports);
        openReport(groups[0].turns[0].filename);
      }
    });
  }, [fetchReports, openReport]);

  const handlePrune = async () => {
    if (
      !window.confirm(
        "Delete all reports older than 7 days? This also removes legacy run_logs artifacts."
      )
    ) {
      return;
    }

    setIsPruning(true);
    try {
      const response = await fetch(`${HTTP_BACKEND_URL}/prompt-reports/prune`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_age_days: 7 }),
      });
      if (!response.ok) throw new Error("Prune request failed");
      const data = await response.json();
      toast.success(
        `Pruned ${data.deleted_count} item${
          data.deleted_count === 1 ? "" : "s"
        }, freed ${formatBytes(data.freed_bytes)}.`,
        { duration: 8000 }
      );
      const refreshed = await fetchReports();
      if (
        selectedFilename &&
        !refreshed.some((report) => report.filename === selectedFilename)
      ) {
        setSelectedFilename(null);
        setContent(null);
      }
    } catch (error) {
      console.error("Error pruning prompt reports", error);
      toast.error("Failed to prune reports.");
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-white">
      <div className="shrink-0">
        <EvalNavigation />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 px-4 py-4">
        <div className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                Prompt Reports
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-300">
                Every LLM request is captured as a JSON report when{" "}
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100">
                  PROMPT_REPORTS_ENABLED=1
                </code>{" "}
                is set.{" "}
                {reportsDirectory && (
                  <span className="font-mono text-xs text-zinc-500">
                    {reportsDirectory}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-right">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Total size on disk
                </div>
                <div className="font-mono text-lg text-zinc-100">
                  {formatBytes(totalSizeBytes)}
                </div>
              </div>
              <button
                onClick={handlePrune}
                disabled={isPruning}
                className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-200 transition-colors hover:bg-red-900/60 disabled:opacity-50"
              >
                {isPruning ? "Pruning…" : "Prune reports older than 7 days"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="min-h-0 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2">
            <div className="px-2 py-1 text-xs uppercase tracking-wide text-zinc-500">
              {isLoadingList
                ? "Loading…"
                : `${sessionGroups.length} request${
                    sessionGroups.length === 1 ? "" : "s"
                  } · ${reports.length} turn${reports.length === 1 ? "" : "s"}`}
            </div>
            {!isLoadingList && reports.length === 0 && (
              <p className="px-2 py-4 text-sm text-zinc-400">
                No reports yet. Start the backend with{" "}
                <code className="rounded bg-zinc-800 px-1 py-0.5">
                  PROMPT_REPORTS_ENABLED=1
                </code>{" "}
                and generate some code.
              </p>
            )}
            {sessionGroups.map((group) => (
              <div
                key={group.sessionId}
                className="mb-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${providerBadgeClass(
                      group.provider
                    )}`}
                  >
                    {group.provider}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {formatBytes(group.sizeBytes)}
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-sm text-zinc-100">
                  {group.model}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-zinc-500">
                    {formatTimestamp(group.createdAt)}
                  </span>
                  <span
                    className="font-mono font-medium text-emerald-400"
                    title="Total cost across all turns in this request"
                  >
                    {formatCost(group.costUsd)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {group.turns.map((turnReport) => (
                    <button
                      key={turnReport.filename}
                      onClick={() => openReport(turnReport.filename)}
                      className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
                        turnReport.filename === selectedFilename
                          ? "border-blue-600 bg-blue-950/60 text-blue-100"
                          : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      turn {turnReport.turn}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="min-h-0 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            {!selectedFilename && (
              <p className="py-8 text-center text-sm text-zinc-400">
                Select a report to inspect the request.
              </p>
            )}
            {selectedFilename && isLoadingContent && (
              <p className="py-8 text-center text-sm text-zinc-400">
                Loading report…
              </p>
            )}
            {selectedFilename && !isLoadingContent && content && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${providerBadgeClass(
                      content.provider
                    )}`}
                  >
                    {content.provider}
                  </span>
                  <span className="font-mono text-sm text-zinc-100">
                    {content.model}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    api: {content.api_model_name} · session{" "}
                    {content.session_id} · turn {content.turn} ·{" "}
                    {formatTimestamp(content.created_at)}
                  </span>
                </div>

                {content.usage ? (
                  <UsagePanel usage={content.usage} />
                ) : (
                  <p className="text-xs italic text-zinc-500">
                    Usage unavailable for this request (turn may not have
                    completed).
                  </p>
                )}

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-200">
                      Request structure
                    </h2>
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {showRawJson ? "Show tree" : "Show raw JSON"}
                    </button>
                  </div>
                  {showRawJson ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
                      {JSON.stringify(content.request, null, 2)}
                    </pre>
                  ) : (
                    <JsonNode label="request" value={content.request} depth={0} />
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default PromptReportsPage;
