import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/project-store";
import { useAppStore } from "../../store/app-store";
import { AppState } from "../../types";
import {
  AgentEvent,
  AgentEventType,
} from "../commits/types";
import {
  BsChatDots,
  BsChevronDown,
  BsChevronRight,
  BsLightbulb,
  BsFileEarmarkPlus,
  BsPencilSquare,
  BsImage,
  BsScissors,
  BsFiles,
} from "react-icons/bs";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighterBase } from "react-syntax-highlighter";
import html from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";
import WorkingPulse from "../core/WorkingPulse";

SyntaxHighlighterBase.registerLanguage("html", html);
const SyntaxHighlighter = SyntaxHighlighterBase as any;

function CodePreviewBlock({ code, isGenerating }: { code: string; isGenerating: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGenerating && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [code, isGenerating]);

  return (
    <div ref={containerRef} className="max-h-60 overflow-auto rounded-md">
      <SyntaxHighlighter
        language="html"
        style={vs2015}
        customStyle={{ margin: 0, padding: "0.5rem", fontSize: "0.75rem", borderRadius: "0.375rem" }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

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

function formatElapsedSince(timestampMs: number | undefined, nowMs: number): string {
  if (!isFiniteNumber(timestampMs)) return "";
  return formatDurationMs(Math.max(0, nowMs - timestampMs));
}

function formatVariantWallClockDuration(
  requestStartedAt: number | undefined,
  completedAt: number | undefined,
  nowMs: number
): string {
  if (!isFiniteNumber(requestStartedAt)) return "";
  const end = isFiniteNumber(completedAt) ? completedAt : nowMs;
  return formatDurationMs(Math.max(0, end - requestStartedAt));
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
      const input = event.input as any;
      const output = event.output as any;
      const count = output?.images?.length || input?.count || 0;
      if (event.status === "running") {
        return count ? `Generating ${count} image${count !== 1 ? "s" : ""}` : "Generating images";
      }
      return count ? `Generated ${count} image${count !== 1 ? "s" : ""}` : "Generated images";
    }
    if (event.toolName === "remove_background") {
      const rbInput = event.input as any;
      const rbOutput = event.output as any;
      const rbCount = rbOutput?.images?.length || rbInput?.image_urls?.length || 0;
      if (event.status === "running") {
        return rbCount > 1 ? `Removing ${rbCount} backgrounds` : "Removing background";
      }
      return rbCount > 1 ? `Removed ${rbCount} backgrounds` : "Background removed";
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
  const input = event.input as any;
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
        <CodePreviewBlock code={variantCode} isGenerating={event.status === "running"} />
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

      {event.toolName === "generate_images" && !hasError && (
        <div>
          {/* While running: show prompts with dividers */}
          {event.status === "running" && input?.prompts && Array.isArray(input.prompts) && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {input.prompts.map((prompt: string, index: number) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400 py-1.5">
                  {prompt}
                </div>
              ))}
            </div>
          )}
          {/* After complete: 50/50 image left, prompt right */}
          {event.status !== "running" && images && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {images.map((item, index) => (
                <div key={`${item.prompt}-${index}`} className="flex gap-3 py-2">
                  <div className="w-1/2 shrink-0">
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.prompt || `Generated image ${index + 1}`}
                        className="w-full rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="aspect-square rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                        Failed
                      </div>
                    )}
                  </div>
                  <div className="w-1/2 text-xs text-gray-600 dark:text-gray-400 self-center">
                    {item.prompt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {event.toolName === "remove_background" && !hasError && (
        <div>
          {/* While running: show the source images */}
          {event.status === "running" && input?.image_urls && Array.isArray(input.image_urls) && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {input.image_urls.map((url: string, index: number) => (
                <div key={index} className="py-2">
                  <img
                    src={url}
                    alt={`Original image ${index + 1}`}
                    className="w-full rounded object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
          {/* After complete: before/after side by side for each image */}
          {event.status !== "running" && output?.images && Array.isArray(output.images) && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {output.images.map((item: any, index: number) => (
                <div key={`${item.image_url}-${index}`} className="flex gap-2 py-2">
                  <div className="w-1/2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Before</div>
                    <img
                      src={item.image_url}
                      alt={`Original image ${index + 1}`}
                      className="w-full rounded object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="w-1/2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">After</div>
                    {item.result_url ? (
                      <div className="relative">
                        <div
                          className="absolute inset-0 rounded"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                            backgroundSize: "10px 10px",
                            backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                          }}
                        />
                        <img
                          src={item.result_url}
                          alt="Background removed"
                          className="relative w-full rounded"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                        Failed
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
        <ReactMarkdown
          components={{
            img: ({ ...props }) => (
              <div className="my-2 flex justify-start max-w-full">
                <img
                  {...props}
                  className="max-h-60 max-w-full object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  loading="lazy"
                />
              </div>
            ),
          }}
        >
          {event.content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2 py-1.5 text-left text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        {getEventIcon(event.type, event.toolName)}
        <span className={`text-sm flex-1 ${event.status === "running" ? "active-step-shimmer" : ""}`}>
          {getEventTitle(event)}
        </span>
        {isExpanded ? (
          <BsChevronDown className="text-xs shrink-0" />
        ) : (
          <BsChevronRight className="text-xs shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="pb-2">
          {event.type === "thinking" && event.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  img: ({ ...props }) => (
                    <div className="my-2 flex justify-start max-w-full">
                      <img
                        {...props}
                        className="max-h-60 max-w-full object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                        loading="lazy"
                      />
                    </div>
                  ),
                }}
              >
                {event.content}
              </ReactMarkdown>
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
  const [stepsExpandedByVariant, setStepsExpandedByVariant] = useState<
    Record<string, boolean>
  >({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const appState = useAppStore((s) => s.appState);

  useEffect(() => {
    if (appState !== AppState.CODING) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [appState]);

  const currentCommit = head ? commits[head] : null;
  const selectedVariant = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex]
    : null;
  const selectedVariantStatus = selectedVariant?.status;
  const variantUiKey =
    currentCommit ? `${currentCommit.hash}:${currentCommit.selectedVariantIndex}` : "";

  const variantCode = selectedVariant?.code || "";
  const events = selectedVariant?.agentEvents || [];
  const lastAssistantId = [...events]
    .reverse()
    .find((event) => event.type === "assistant")?.id;
  const requestStartMs =
    selectedVariant?.requestStartedAt ??
    (currentCommit?.dateCreated
      ? new Date(currentCommit.dateCreated).getTime()
      : undefined);

  const isLatestCommit = head === latestCommitHash;
  if (!isLatestCommit || events.length === 0) {
    return null;
  }

  const isDone =
    selectedVariantStatus === "complete" ||
    selectedVariantStatus === "error" ||
    selectedVariantStatus === "cancelled";
  const runningDuration = formatElapsedSince(requestStartMs, nowMs);
  const variantDuration = formatVariantWallClockDuration(
    requestStartMs,
    selectedVariant?.completedAt,
    nowMs
  );
  const stepsExpanded = variantUiKey
    ? Boolean(stepsExpandedByVariant[variantUiKey])
    : false;
  const stepEvents = events.filter((e) => e.type === "tool" || e.type === "thinking");
  const assistantEvents = events.filter((e) => e.type === "assistant");

  return (
    <div className="space-y-1 mb-3">
      {isDone ? (
        <>
          {/* Collapsed steps summary */}
          <button
            onClick={() =>
              setStepsExpandedByVariant((prev) => ({
                ...prev,
                [variantUiKey]: !prev[variantUiKey],
              }))
            }
            className="w-full flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-left"
          >
            {stepsExpanded ? (
              <BsChevronDown className="text-gray-400 text-xs" />
            ) : (
              <BsChevronRight className="text-gray-400 text-xs" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Worked through {stepEvents.length} step{stepEvents.length !== 1 ? "s" : ""}{variantDuration ? ` in ${variantDuration}` : ""}
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
          <div className="flex items-center justify-between rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-white dark:from-violet-900/20 dark:to-zinc-900 px-3 py-2 shadow-[0_0_15px_-3px_rgba(139,92,246,0.3)] dark:shadow-[0_0_15px_-3px_rgba(139,92,246,0.4)] transition-all duration-500">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <WorkingPulse />
              <span>Working...</span>
            </div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Time so far {runningDuration || "--"}
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
