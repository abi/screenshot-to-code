import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import {
  BsBookmarkCheck,
  BsBoundingBox,
  BsCamera,
  BsChatDots,
  BsChevronDown,
  BsChevronRight,
  BsFileEarmarkPlus,
  BsFiles,
  BsFlagFill,
  BsImage,
  BsLightbulb,
  BsPencilSquare,
  BsScissors,
} from "react-icons/bs";

import { formatCost, formatMs } from "./report-format";
import { JsonNode } from "./report-json";
import ToolPreview from "./agent-run-tool-preview";

export interface RunEvent {
  seq: number;
  ts_ms: number;
  type: string;
  step?: number;
  [key: string]: unknown;
}

export type TimelineViewMode = "readable" | "raw";

// "best" opens everything except bulky code tools (create_file, edit_file).
export type ExpandMode = "expand" | "collapse" | "best";

export interface ExpandSignal {
  mode: ExpandMode;
  version: number;
}

const BULKY_TOOLS = new Set(["create_file", "edit_file"]);

interface UsageDict {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  total: number;
}

interface ToolRow {
  toolEventId: string;
  name: string;
  start?: RunEvent;
  end?: RunEvent;
}

interface StepGroup {
  step: number;
  start?: RunEvent;
  end?: RunEvent;
  tools: ToolRow[];
}

// Mirrors AgentActivity's getEventIcon so the timeline reads like the
// in-app tool-call list.
function toolIcon(toolName: string) {
  switch (toolName) {
    case "create_file":
      return <BsFileEarmarkPlus className="text-indigo-400" />;
    case "edit_file":
      return <BsPencilSquare className="text-purple-400" />;
    case "generate_images":
      return <BsImage className="text-pink-400" />;
    case "remove_backgrounds":
      return <BsScissors className="text-teal-400" />;
    case "edit_images":
      return <BsImage className="text-violet-400" />;
    case "retrieve_option":
      return <BsFiles className="text-slate-400" />;
    case "save_assets":
      return <BsBookmarkCheck className="text-emerald-400" />;
    case "extract_assets":
      return <BsBoundingBox className="text-orange-400" />;
    case "screenshot_preview":
      return <BsCamera className="text-cyan-400" />;
    default:
      return <BsFileEarmarkPlus className="text-gray-400" />;
  }
}

function groupEvents(events: RunEvent[]): {
  steps: StepGroup[];
  runEnd: RunEvent | null;
} {
  const stepsByNumber = new Map<number, StepGroup>();
  let runEnd: RunEvent | null = null;

  const stepFor = (stepNumber: number): StepGroup => {
    let group = stepsByNumber.get(stepNumber);
    if (!group) {
      group = { step: stepNumber, tools: [] };
      stepsByNumber.set(stepNumber, group);
    }
    return group;
  };

  for (const event of events) {
    if (event.type === "llm_call_start" && typeof event.step === "number") {
      stepFor(event.step).start = event;
    } else if (event.type === "llm_call_end" && typeof event.step === "number") {
      stepFor(event.step).end = event;
    } else if (
      (event.type === "tool_call_start" || event.type === "tool_call_end") &&
      typeof event.step === "number"
    ) {
      const group = stepFor(event.step);
      const toolEventId = String(event.tool_event_id ?? "");
      let row = group.tools.find((tool) => tool.toolEventId === toolEventId);
      if (!row) {
        row = {
          toolEventId,
          name: String(event.name ?? "unknown_tool"),
          start: undefined,
          end: undefined,
        };
        group.tools.push(row);
      }
      if (event.type === "tool_call_start") row.start = event;
      else row.end = event;
    } else if (event.type === "run_end") {
      runEnd = event;
    }
  }

  const steps = [...stepsByNumber.values()].sort((a, b) => a.step - b.step);
  return { steps, runEnd };
}

function openForSignal(signal: ExpandSignal, collapseInBest: boolean): boolean {
  if (signal.mode === "best") return !collapseInBest;
  return signal.mode === "expand";
}

function CollapsibleCard({
  icon,
  title,
  meta,
  tint,
  collapseInBest = false,
  expandSignal,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  tint?: "error";
  collapseInBest?: boolean;
  expandSignal: ExpandSignal;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(() =>
    openForSignal(expandSignal, collapseInBest)
  );

  useEffect(() => {
    setOpen(openForSignal(expandSignal, collapseInBest));
  }, [expandSignal, collapseInBest]);

  return (
    <div
      className={`rounded-lg border ${
        tint === "error"
          ? "border-red-900 bg-red-950/30"
          : "border-zinc-800 bg-zinc-950/50"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-zinc-100">
          {title}
        </span>
        {meta && (
          <span className="shrink-0 font-mono text-[11px] text-zinc-500">
            {meta}
          </span>
        )}
        <span className="shrink-0 text-zinc-500">
          {open ? <BsChevronDown /> : <BsChevronRight />}
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-800/70 p-2.5">{children}</div>
      )}
    </div>
  );
}

function usageBreakdown(usage: UsageDict | null | undefined): string {
  if (!usage) return "no usage";
  const parts = [
    `in ${usage.input.toLocaleString()}`,
    `out ${usage.output.toLocaleString()}`,
    `cr ${usage.cache_read.toLocaleString()}`,
  ];
  if (usage.cache_write > 0) parts.push(`cw ${usage.cache_write.toLocaleString()}`);
  return parts.join(" · ");
}

function StepCard({
  group,
  viewMode,
  expandSignal,
}: {
  group: StepGroup;
  viewMode: TimelineViewMode;
  expandSignal: ExpandSignal;
}) {
  const readable = viewMode === "readable";
  const end = group.end;
  const thinkingText =
    typeof end?.thinking_text === "string" ? end.thinking_text : "";
  const assistantText =
    typeof end?.assistant_text === "string" ? end.assistant_text : "";
  const usage = (end?.usage ?? null) as UsageDict | null;
  const costUsd = typeof end?.cost_usd === "number" ? end.cost_usd : null;
  const durationMs =
    typeof end?.duration_ms === "number" ? end.duration_ms : null;
  const thinkingMs = typeof end?.thinking_ms === "number" ? end.thinking_ms : 0;
  const apiModel =
    typeof group.start?.api_model_name === "string"
      ? group.start.api_model_name
      : "";

  const headerMeta = [
    costUsd === null ? null : formatCost(costUsd),
    formatMs(durationMs),
    usageBreakdown(usage),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <div className="text-xs font-semibold text-zinc-200">
          Step {group.step}
          {apiModel && (
            <span className="ml-2 font-mono text-[11px] font-normal text-zinc-500">
              {apiModel}
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-zinc-400">{headerMeta}</div>
      </div>
      <div className="flex flex-col gap-1.5">
        {!readable && group.start && (
          <CollapsibleCard
            icon={<BsChatDots className="text-blue-400" />}
            title="LLM request"
            meta="full payload"
            expandSignal={expandSignal}
          >
            <JsonNode label="request" value={group.start.request} depth={0} />
          </CollapsibleCard>
        )}
        {thinkingText && (
          <CollapsibleCard
            icon={<BsLightbulb className="text-yellow-400" />}
            title={
              thinkingMs > 0 ? `Thought for ${formatMs(thinkingMs)}` : "Thinking"
            }
            meta={`${thinkingText.length.toLocaleString()} chars`}
            expandSignal={expandSignal}
          >
            <div className="max-h-96 overflow-y-auto text-xs leading-5 text-zinc-300">
              <Markdown>{thinkingText}</Markdown>
            </div>
          </CollapsibleCard>
        )}
        {group.tools.map((tool) => {
          const toolEnd = tool.end;
          const ok = toolEnd ? toolEnd.ok !== false : true;
          const toolDuration =
            typeof toolEnd?.duration_ms === "number"
              ? toolEnd.duration_ms
              : null;
          const bulky = BULKY_TOOLS.has(tool.name);
          return (
            <CollapsibleCard
              key={tool.toolEventId}
              icon={toolIcon(tool.name)}
              title={tool.name}
              meta={`${formatMs(toolDuration)}${ok ? "" : " · error"}`}
              tint={ok ? undefined : "error"}
              collapseInBest={bulky}
              expandSignal={expandSignal}
            >
              {readable ? (
                <ToolPreview
                  name={tool.name}
                  args={tool.start?.arguments}
                  summary={toolEnd?.summary ?? null}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {tool.start && (
                    <JsonNode
                      label="input"
                      value={tool.start.arguments}
                      depth={0}
                      defaultOpen
                    />
                  )}
                  {toolEnd && (
                    <JsonNode
                      label="output"
                      value={toolEnd.result ?? toolEnd.summary}
                      depth={0}
                      defaultOpen
                    />
                  )}
                </div>
              )}
              {!toolEnd && (
                <p className="mt-2 text-xs italic text-zinc-500">
                  No result recorded (run may have been interrupted).
                </p>
              )}
            </CollapsibleCard>
          );
        })}
        {assistantText && (
          <CollapsibleCard
            icon={<BsChatDots className="text-blue-400" />}
            title="Response"
            meta={`${assistantText.length.toLocaleString()} chars`}
            expandSignal={expandSignal}
          >
            <div className="max-h-96 overflow-y-auto text-xs leading-5 text-zinc-300">
              <Markdown>{assistantText}</Markdown>
            </div>
          </CollapsibleCard>
        )}
        {!end && (
          <p className="text-xs italic text-zinc-500">
            LLM call did not complete (run failed or is still in flight).
          </p>
        )}
      </div>
    </div>
  );
}

function AgentRunTimeline({
  events,
  viewMode,
  expandSignal,
}: {
  events: RunEvent[];
  viewMode: TimelineViewMode;
  expandSignal: ExpandSignal;
}) {
  const { steps, runEnd } = groupEvents(events);

  if (steps.length === 0 && !runEnd) {
    return (
      <p className="py-4 text-center text-sm text-zinc-400">
        No timeline events recorded for this run.
      </p>
    );
  }

  const runEndError =
    runEnd && typeof runEnd.error === "string" ? runEnd.error : null;

  return (
    <div className="flex flex-col gap-2">
      {steps.map((group) => (
        <StepCard
          key={group.step}
          group={group}
          viewMode={viewMode}
          expandSignal={expandSignal}
        />
      ))}
      {runEnd && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
            runEnd.status === "completed"
              ? "border-emerald-900 bg-emerald-950/30 text-emerald-200"
              : "border-red-900 bg-red-950/30 text-red-200"
          }`}
        >
          <BsFlagFill />
          <span>
            Run {String(runEnd.status)} · total{" "}
            {formatMs(
              typeof runEnd.total_duration_ms === "number"
                ? runEnd.total_duration_ms
                : null
            )}
          </span>
          {runEndError && (
            <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
              {runEndError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default AgentRunTimeline;
