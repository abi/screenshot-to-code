from custom_types import InputMode
from prompts.prompt_types import (
    PromptConstructionPlan,
    PromptHistoryMessage,
    Stack,
)


def derive_prompt_construction_plan(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    history: list[PromptHistoryMessage],
    file_state: dict[str, str] | None,
) -> PromptConstructionPlan:
    if generation_type == "update":
        if len(history) > 0:
            strategy = "update_from_history"
        elif file_state and file_state.get("content", "").strip():
            strategy = "update_from_file_snapshot"
        else:
            raise ValueError("Update requests require history or fileState.content")
        return {
            "generation_type": "update",
            "input_mode": input_mode,
            "stack": stack,
            "construction_strategy": strategy,
        }

    return {
        "generation_type": "create",
        "input_mode": input_mode,
        "stack": stack,
        "construction_strategy": "create_from_input",
    }
