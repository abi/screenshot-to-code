from typing import Protocol

from agentic.streaming.types import EventSink, ExecutedToolCall, StepResult


class ProviderAdapter(Protocol):
    async def run_step(self, on_event: EventSink) -> StepResult:
        ...

    def apply_tool_results(
        self,
        step_result: StepResult,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        ...
