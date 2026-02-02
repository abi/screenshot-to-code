import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "../../store/project-store";
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
} from "react-icons/bs";
import ReactMarkdown from "react-markdown";

function getPreview(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 140)}...`;
}

function formatDuration(startedAt?: number, endedAt?: number): string {
  if (!startedAt || !endedAt) return "";
  const seconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));
  return `${seconds}s`;
}

function formatTotalDuration(events: AgentEvent[]): string {
  if (events.length === 0) return "";
  const start = Math.min(...events.map((event) => event.startedAt));
  const now = Date.now();
  const end = Math.max(
    ...events.map((event) => event.endedAt ?? now)
  );
  const seconds = Math.max(1, Math.round((end - start) / 1000));
  return `${seconds}s`;
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
    return event.status === "running" ? "Running tool" : "Tool completed";
  }
  return "Activity";
}

function renderToolDetails(event: AgentEvent) {
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

  const images =
    event.output && Array.isArray((event.output as any).images)
      ? ((event.output as any).images as Array<any>)
      : null;

  return (
    <div className="text-sm text-gray-700 dark:text-gray-200">
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
          {images ? (
            <div className="mt-2 space-y-2">
              {images.map((item, index) => (
                <div
                  key={`${item.prompt}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-2"
                >
                  <div>
                    <div className="text-xs text-gray-500">Prompt</div>
                    <div className="text-sm text-gray-700 dark:text-gray-100">
                      {item.prompt}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.status === "ok" ? "✓" : "⚠"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            renderJson(event.output)
          )}
        </div>
      )}
    </div>
  );
}

function AgentEventCard({
  event,
  autoExpand,
}: {
  event: AgentEvent;
  autoExpand?: boolean;
}) {
  const [expanded, setExpanded] = useState(Boolean(autoExpand));

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
    }
  }, [autoExpand]);

  const isExpanded =
    (event.type !== "thinking" && event.status === "running") || expanded;
  const preview = useMemo(() => getPreview(event.content || ""), [event.content]);

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
      {isExpanded ? (
        <div className="px-3 pb-3">
          {event.type !== "tool" && event.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{event.content}</ReactMarkdown>
            </div>
          )}
          {event.type === "tool" && renderToolDetails(event)}
        </div>
      ) : (
        preview &&
        event.type !== "thinking" && (
          <div className="px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">
            {preview}
          </div>
        )
      )}
    </div>
  );
}

function AgentActivity() {
  const { head, commits, latestCommitHash } = useProjectStore();

  const currentCommit = head ? commits[head] : null;
  const selectedVariant = currentCommit
    ? currentCommit.variants[currentCommit.selectedVariantIndex]
    : null;

  const events = selectedVariant?.agentEvents || [];
  const lastAssistantId = [...events]
    .reverse()
    .find((event) => event.type === "assistant")?.id;

  const isLatestCommit = head === latestCommitHash;
  if (!isLatestCommit || events.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-3">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2">
        <div className="text-xs uppercase tracking-wide text-gray-400">
          Agent activity
        </div>
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          Total time {formatTotalDuration(events)}
        </div>
      </div>
      {events.map((event) => (
        <AgentEventCard
          key={event.id}
          event={event}
          autoExpand={event.type === "assistant" && event.id === lastAssistantId}
        />
      ))}
    </div>
  );
}

export default AgentActivity;
