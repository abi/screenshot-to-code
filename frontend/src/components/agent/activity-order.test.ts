import { AgentEvent } from "../commits/types";
import { groupCompletedAgentEvents } from "./activity-order";

function event(
  id: string,
  type: AgentEvent["type"],
  startedAt: number
): AgentEvent {
  return {
    id,
    type,
    status: "complete",
    startedAt,
    endedAt: startedAt + 1,
    content: type === "assistant" ? id : undefined,
  };
}

describe("groupCompletedAgentEvents", () => {
  test("keeps assistant responses on their original sides of tool calls", () => {
    const events = [
      event("response-before-tool", "assistant", 1),
      event("thinking", "thinking", 2),
      event("tool", "tool", 3),
      event("response-after-tool", "assistant", 4),
    ];

    const groups = groupCompletedAgentEvents(events);

    expect(groups.map((group) => group.type)).toEqual([
      "assistant",
      "steps",
      "assistant",
    ]);
    expect(groups[0]).toMatchObject({
      type: "assistant",
      event: { id: "response-before-tool" },
    });
    expect(groups[1]).toMatchObject({
      type: "steps",
      events: [{ id: "thinking" }, { id: "tool" }],
    });
    expect(groups[2]).toMatchObject({
      type: "assistant",
      event: { id: "response-after-tool" },
    });
  });

  test("starts a new step group after every assistant response", () => {
    const events = [
      event("tool-one", "tool", 1),
      event("response-between-tools", "assistant", 2),
      event("tool-two", "tool", 3),
    ];

    expect(groupCompletedAgentEvents(events).map((group) => group.type)).toEqual([
      "steps",
      "assistant",
      "steps",
    ]);
  });
});
