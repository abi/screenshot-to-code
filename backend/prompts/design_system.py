def build_design_system_prompt_block(design_system: str | None) -> str:
    if not design_system or not design_system.strip():
        return ""

    return f"""
## Design system

If the design system conflicts with other instructions, prioritize the design system.

<design_system>
{design_system.strip()}
</design_system>
"""
