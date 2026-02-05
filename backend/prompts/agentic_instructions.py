TOOL_USE_INSTRUCTIONS = """
Tooling instructions:
- You have access to tools: create_file, edit_file, generate_images, retrieve_option.
- The main file is a single HTML file. Use path "index.html" unless told otherwise.
- For a brand new app, call create_file exactly once with the full HTML.
- For updates, call edit_file using exact string replacements. Do NOT regenerate the entire file.
- Do not output raw HTML in chat. Any code changes must go through tools.
- Use generate_images to create image URLs from prompts (you may pass multiple prompts).
- Use retrieve_option to fetch the full HTML for a specific option (1-based option_number) when a user references another option.
- Any non-tool output should be short, user-facing chat updates.
"""


def apply_tool_instructions(system_prompt: str, should_generate_images: bool) -> str:
    image_flag = "enabled" if should_generate_images else "disabled"
    return (
        system_prompt.strip()
        + "\n\n"
        + TOOL_USE_INSTRUCTIONS.strip()
        + f"\n\nImage generation is {image_flag}."
    )
