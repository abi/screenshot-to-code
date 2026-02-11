import { useEffect, useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { useAppStore } from "../../store/app-store";
import { AppState } from "../../types";
import {
  AgentEvent,
  AgentEventStatus,
  AgentEventType,
} from "../commits/types";
import {
  BsChatDots,
  BsChevronDown,
  BsChevronRight,
  BsCheckCircle,
  BsXCircle,
  BsLightbulb,
  BsFileEarmarkPlus,
  BsPencilSquare,
  BsImage,
  BsScissors,
  BsFiles,
} from "react-icons/bs";
import ReactMarkdown from "react-markdown";


function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatDurationMs(milliseconds: number): string {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDuration(startedAt?: number, endedAt?: number): string {
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(endedAt)) return "";
  return formatDurationMs(endedAt - startedAt);
}

function formatTotalDuration(events: AgentEvent[]): string {
  if (events.length === 0) return "";
  const now = Date.now();
  const totalMs = events.reduce((acc, event) => {
    if (!isFiniteNumber(event.startedAt)) return acc;
    const end = isFiniteNumber(event.endedAt) ? event.endedAt : now;
    const duration = Math.max(0, end - event.startedAt);
    return acc + duration;
  }, 0);
  return totalMs > 0 ? formatDurationMs(totalMs) : "";
}

function getStatusTone(status: AgentEventStatus) {
  if (status === "running") {
    return "border-emerald-300 bg-emerald-50/80 dark:border-emerald-600 dark:bg-emerald-900/20";
  }
  if (status === "error") {
    return "border-red-300 bg-red-50/80 dark:border-red-600 dark:bg-red-900/20";
  }
  return "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/40";
}

function renderStatusIcon(status: AgentEventStatus) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400">
          running
        </span>
      </span>
    );
  }
  if (status === "error") {
    return <BsXCircle className="text-red-500" />;
  }
  return <BsCheckCircle className="text-emerald-600" />;
}

function getEventIcon(type: AgentEventType, toolName?: string) {
  if (type === "thinking") {
    return <BsLightbulb className="text-yellow-500" />;
  }
  if (type === "assistant") {
    return <BsChatDots className="text-blue-500" />;
  }
  if (toolName === "create_file") {
    return <BsFileEarmarkPlus className="text-indigo-500" />;
  }
  if (toolName === "edit_file") {
    return <BsPencilSquare className="text-purple-500" />;
  }
  if (toolName === "generate_images") {
    return <BsImage className="text-pink-500" />;
  }
  if (toolName === "remove_background") {
    return <BsScissors className="text-teal-500" />;
  }
  if (toolName === "retrieve_option") {
    return <BsFiles className="text-slate-500" />;
  }
  return <BsFileEarmarkPlus className="text-gray-500" />;
}

function getEventTitle(event: AgentEvent): string {
  if (event.type === "thinking") {
    if (event.status === "running") return "Thinking";
    const duration = formatDuration(event.startedAt, event.endedAt);
    return duration ? `Thought for ${duration}` : "Thought";
  }
  if (event.type === "assistant") {
    return "Assistant response";
  }
  if (event.type === "tool") {
    if (event.toolName === "create_file") {
      return event.status === "running" ? "Creating file" : "Created file";
    }
    if (event.toolName === "edit_file") {
      return event.status === "running" ? "Editing file" : "Edited file";
    }
    if (event.toolName === "generate_images") {
      return event.status === "running"
        ? "Generating images"
        : "Generated images";
    }
    if (event.toolName === "remove_background") {
      return event.status === "running"
        ? "Removing background"
        : "Background removed";
    }
    if (event.toolName === "retrieve_option") {
      return event.status === "running"
        ? "Retrieving option"
        : "Retrieved option";
    }
    return event.status === "running" ? "Running tool" : "Tool completed";
  }
  return "Activity";
}


function renderToolDetails(event: AgentEvent, variantCode?: string) {
  if (!event.input && !event.output) return null;

  const renderJson = (data: unknown) => {
    if (!data) return null;
    let json = "";
    try {
      json = JSON.stringify(data, null, 2);
    } catch {
      json = String(data);
    }
    if (json.length > 900) {
      json = json.slice(0, 900) + "...";
    }
    return (
      <pre className="mt-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2 text-xs text-gray-700 dark:text-gray-200 overflow-x-auto">
        {json}
      </pre>
    );
  };

  const output = event.output as any;
  const hasError = Boolean(output?.error);
  const images =
    output && Array.isArray(output.images) ? (output.images as Array<any>) : null;
  const edits =
    output && Array.isArray(output.edits) ? (output.edits as Array<any>) : null;

  return (
    <div className="text-sm text-gray-700 dark:text-gray-200">
      {hasError && (
        <div className="rounded-md border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-3">
          <div className="text-xs uppercase tracking-wide text-red-500">Error</div>
          <div className="mt-1 text-sm text-red-700 dark:text-red-200">
            {output?.error}
          </div>
          {event.input && (
            <div className="mt-2">
              <div className="text-xs uppercase tracking-wide text-red-400">
                Input
              </div>
              {renderJson(event.input)}
            </div>
          )}
        </div>
      )}
      {event.toolName === "create_file" && !hasError && variantCode && (
        <pre className="rounded-md bg-gray-50 dark:bg-gray-800 p-2 text-xs text-gray-700 dark:text-gray-200 overflow-auto max-h-60 whitespace-pre-wrap break-all">
          {variantCode}
        </pre>
      )}

      {event.toolName === "edit_file" && edits && !hasError && (
        <div className="space-y-2">
          {edits.map((edit, index) => (
            <div
              key={`${edit.old_text}-${index}`}
              className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-3"
            >
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Edit {index + 1}
              </div>
              <div className="mt-2 grid gap-2">
                <div>
                  <div className="text-xs text-gray-500">Old</div>
                  <div className="mt-1 rounded bg-red-50 dark:bg-red-900/30 p-2 text-xs font-mono text-red-700 dark:text-red-200 break-all">
                    {edit.old_text}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">New</div>
                  <div className="mt-1 rounded bg-emerald-50 dark:bg-emerald-900/30 p-2 text-xs font-mono text-emerald-700 dark:text-emerald-200 break-all">
                    {edit.new_text}
                  </div>
                </div>
              </div>
              {edit.replaced !== undefined && (
                <div className="mt-2 text-xs text-gray-500">
                  Replaced {edit.replaced} time{edit.replaced === 1 ? "" : "s"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {event.toolName === "generate_images" && images && !hasError && (
        <div className="space-y-2">
          {images.map((item, index) => (
            <div
              key={`${item.prompt}-${index}`}
              className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-3"
            >
              {item.url ? (
                <img
                  src={item.url}
                  alt={item.prompt || `Generated image ${index + 1}`}
                  className="h-16 w-16 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                  loading="lazy"
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                  N/A
                </div>
              )}
              <div className="flex-1">
                <div className="text-xs text-gray-500">Prompt</div>
                <div className="text-sm text-gray-700 dark:text-gray-100">
                  {item.prompt}
                </div>
                {item.url && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {item.url}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {item.status === "ok" ? "✓" : "⚠"}
              </div>
            </div>
          ))}
        </div>
      )}

      {event.toolName === "remove_background" && !hasError && (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-2">Before</div>
              {output?.image_url ? (
                <img
                  src={output.image_url}
                  alt="Original image"
                  className="w-full max-w-[120px] rounded-md border border-gray-200 dark:border-gray-700"
                  loading="lazy"
                />
              ) : (
                <div className="h-20 w-20 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                  N/A
                </div>
              )}
            </div>
            <div className="text-gray-400 text-xl">→</div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-2">After</div>
              {output?.result_url ? (
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-md max-w-[120px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                      backgroundSize: "10px 10px",
                      backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                    }}
                  />
                  <img
                    src={output.result_url}
                    alt="Background removed"
                    className="relative w-full max-w-[120px] rounded-md border border-gray-200 dark:border-gray-700"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                  N/A
                </div>
              )}
            </div>
          </div>
          {output?.result_url && (
            <div className="text-xs text-gray-500 mt-3 truncate">
              {output.result_url}
            </div>
          )}
        </div>
      )}

      {!event.toolName && !hasError && (
        <>
          {event.input && (
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Input
              </div>
              {renderJson(event.input)}
            </div>
          )}
          {event.output && (
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Output
              </div>
              {renderJson(event.output)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgentEventCard({
  event,
  autoExpand,
  variantCode,
}: {
  event: AgentEvent;
  autoExpand?: boolean;
  variantCode?: string;
}) {
  const [expanded, setExpanded] = useState(Boolean(autoExpand));

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
    }
  }, [autoExpand]);

  const isExpanded =
    (event.type !== "thinking" && event.status === "running") || expanded;

  if (event.type === "assistant") {
    if (!event.content) return null;
    return (
      <div className="py-1 text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{event.content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${getStatusTone(event.status)} transition-shadow`}
    >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          {getEventIcon(event.type, event.toolName)}
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {getEventTitle(event)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {renderStatusIcon(event.status)}
          {isExpanded ? (
            <BsChevronDown className="text-gray-400" />
          ) : (
            <BsChevronRight className="text-gray-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          {event.type === "thinking" && event.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{event.content}</ReactMarkdown>
            </div>
          )}
          {event.type === "tool" && renderToolDetails(event, variantCode)}
        </div>
      )}
    </div>
  );
}

function AgentActivity() {
  const { head, commits, latestCommitHash } = useProjectStore();
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const appState = useAppStore((s) => s.appState);

  const currentCommit = head ? commits[head] : null;
  const selectedVariant = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex]
    : null;

  const variantCode = selectedVariant?.code || "";
  const events = selectedVariant?.agentEvents || [];
  const lastAssistantId = [...events]
    .reverse()
    .find((event) => event.type === "assistant")?.id;
  const totalDuration = formatTotalDuration(events);

  const isLatestCommit = head === latestCommitHash;
  if (!isLatestCommit || events.length === 0) {
    return null;
  }

  const isDone = appState !== AppState.CODING;
  const stepEvents = events.filter((e) => e.type === "tool" || e.type === "thinking");
  const assistantEvents = events.filter((e) => e.type === "assistant");

  return (
    <div className="space-y-1 mb-3">
      {isDone ? (
        <>
          {/* Collapsed steps summary */}
          <button
            onClick={() => setStepsExpanded((prev) => !prev)}
            className="w-full flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-left"
          >
            {stepsExpanded ? (
              <BsChevronDown className="text-gray-400 text-xs" />
            ) : (
              <BsChevronRight className="text-gray-400 text-xs" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Worked through {stepEvents.length} step{stepEvents.length !== 1 ? "s" : ""}{totalDuration ? ` in ${totalDuration}` : ""}
            </span>
          </button>
          {stepsExpanded && (
            <div className="space-y-1">
              {stepEvents.map((event) => (
                <AgentEventCard key={event.id} event={event} variantCode={event.toolName === "create_file" ? variantCode : undefined} />
              ))}
            </div>
          )}
          {/* Assistant responses always visible */}
          {assistantEvents.map((event) => (
            <AgentEventCard
              key={event.id}
              event={event}
              autoExpand={event.id === lastAssistantId}
            />
          ))}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-400">
              Agent activity
            </div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Time so far {totalDuration || "--"}
            </div>
          </div>
          {events.map((event) => (
            <AgentEventCard
              key={event.id}
              event={event}
              autoExpand={event.type === "assistant" && event.id === lastAssistantId}
              variantCode={event.toolName === "create_file" ? variantCode : undefined}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default AgentActivity;
