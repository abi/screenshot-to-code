from custom_types import InputMode
from prompts.create import build_create_prompt_from_input
from prompts.plan import derive_prompt_construction_plan
from prompts.prompt_types import PromptHistoryMessage, Stack, UserTurnInput
from prompts.message_builder import Prompt
from prompts.update import (
    build_update_prompt_from_file_snapshot,
    build_update_prompt_from_history,
)


async def build_prompt_messages(
    stack: Stack,
    input_mode: InputMode,
    generation_type: str,
    prompt: UserTurnInput,
    history: list[PromptHistoryMessage],
    file_state: dict[str, str] | None = None,
    image_generation_enabled: bool = True,
) -> Prompt:
    plan = derive_prompt_construction_plan(
        stack=stack,
        input_mode=input_mode,
        generation_type=generation_type,
        history=history,
        file_state=file_state,
    )

    strategy = plan["construction_strategy"]
    if strategy == "update_from_history":
        return build_update_prompt_from_history(
            stack=stack,
            history=history,
            image_generation_enabled=image_generation_enabled,
        )
    if strategy == "update_from_file_snapshot":
        assert file_state is not None
        return build_update_prompt_from_file_snapshot(
            stack=stack,
            prompt=prompt,
            file_state=file_state,
            image_generation_enabled=image_generation_enabled,
        )
    return build_create_prompt_from_input(
        input_mode,
        stack,
        prompt,
        image_generation_enabled,
    )
