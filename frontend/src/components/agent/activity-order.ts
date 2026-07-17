import { AgentEvent } from "../commits/types";

export type CompletedAgentEventGroup =
  | { type: "assistant"; event: AgentEvent }
  | { type: "steps"; events: AgentEvent[] };

/**
 * Keep completed activity in stream order while collapsing consecutive
 * thinking/tool events into compact step groups.
 */
export function groupCompletedAgentEvents(
  events: AgentEvent[]
): CompletedAgentEventGroup[] {
  return events.reduce<CompletedAgentEventGroup[]>((groups, event) => {
    if (event.type === "assistant") {
      groups.push({ type: "assistant", event });
      return groups;
    }

    const previousGroup = groups[groups.length - 1];
    if (previousGroup?.type === "steps") {
      previousGroup.events.push(event);
    } else {
      groups.push({ type: "steps", events: [event] });
    }
    return groups;
  }, []);
}
