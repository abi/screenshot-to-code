# pyright: reportUnknownVariableType=false
from typing import Any, Dict, List, Optional, Tuple

from codegen.utils import extract_html_content
from config import REPLICATE_API_KEY
from image_generation.generation import process_tasks
from image_generation.replicate import remove_background

from agent.state import AgentFileState, ensure_str
from agent.tools.edit_diff import (
    count_fuzzy_occurrences,
    detect_line_ending,
    fuzzy_find_text,
    generate_diff_string,
    normalize_to_lf,
    restore_line_endings,
    strip_bom,
)
from agent.tools.types import ToolCall, ToolExecutionResult
from agent.tools.summaries import summarize_text


class AgentToolRuntime:
    def __init__(
        self,
        file_state: AgentFileState,
        should_generate_images: bool,
        openai_api_key: Optional[str],
        openai_base_url: Optional[str],
        option_codes: Optional[List[str]] = None,
    ):
        self.file_state = file_state
        self.should_generate_images = should_generate_images
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.option_codes = option_codes or []

    async def execute(self, tool_call: ToolCall) -> ToolExecutionResult:
        if "INVALID_JSON" in tool_call.arguments:
            invalid_json = ensure_str(tool_call.arguments.get("INVALID_JSON"))
            return ToolExecutionResult(
                ok=False,
                result={
                    "error": "Tool arguments were invalid JSON.",
                    "INVALID_JSON": invalid_json,
                },
                summary={"error": "Invalid JSON tool arguments"},
            )

        if tool_call.name == "create_file":
            return self._create_file(tool_call.arguments)
        if tool_call.name == "edit_file":
            return self._edit_file(tool_call.arguments)
        if tool_call.name == "generate_images":
            return await self._generate_images(tool_call.arguments)
        if tool_call.name == "remove_background":
            return await self._remove_background(tool_call.arguments)
        if tool_call.name == "retrieve_option":
            return self._retrieve_option(tool_call.arguments)
        return ToolExecutionResult(
            ok=False,
            result={"error": f"Unknown tool: {tool_call.name}"},
            summary={"error": f"Unknown tool: {tool_call.name}"},
        )

    def _create_file(self, args: Dict[str, Any]) -> ToolExecutionResult:
        path = ensure_str(args.get("path") or self.file_state.path or "index.html")
        content = ensure_str(args.get("content"))
        if not content:
            return ToolExecutionResult(
                ok=False,
                result={"error": "create_file requires non-empty content"},
                summary={"error": "Missing content"},
            )

        extracted = extract_html_content(content)
        self.file_state.path = path
        self.file_state.content = extracted or content

        summary = {
            "path": self.file_state.path,
            "contentLength": len(self.file_state.content),
            "preview": summarize_text(self.file_state.content, 320),
        }
        result = {
            "content": f"Successfully created file at {self.file_state.path}.",
            "details": {
                "path": self.file_state.path,
                "contentLength": len(self.file_state.content),
            },
        }
        return ToolExecutionResult(
            ok=True,
            result=result,
            summary=summary,
            updated_content=self.file_state.content,
        )

    def _apply_single_edit(
        self,
        content: str,
        old_text: str,
        new_text: str,
        count: Optional[int],
    ) -> Tuple[str, int, Optional[str]]:
        normalized_content = normalize_to_lf(content)
        normalized_old = normalize_to_lf(old_text)
        normalized_new = normalize_to_lf(new_text)

        match_result = fuzzy_find_text(normalized_content, normalized_old)

        if not match_result.found:
            return content, 0, None

        base_content = match_result.content_for_replacement

        if count is None:
            occurrences = count_fuzzy_occurrences(
                normalized_content, normalized_old
            )
            if occurrences > 1:
                return (
                    content,
                    0,
                    f"Found {occurrences} occurrences of the text. "
                    "Please provide more context to make it unique.",
                )
            replace_count = 1
        elif count < 0:
            replace_count = count_fuzzy_occurrences(
                normalized_content, normalized_old
            )
        else:
            replace_count = count

        updated = base_content
        replacements_done = 0
        search_start = 0
        for _ in range(replace_count):
            match = fuzzy_find_text(updated[search_start:], normalized_old)
            if not match.found:
                break
            abs_index = search_start + match.index
            updated = (
                updated[:abs_index]
                + normalized_new
                + updated[abs_index + match.match_length :]
            )
            search_start = abs_index + len(normalized_new)
            replacements_done += 1

        original_ending = detect_line_ending(content)
        updated = restore_line_endings(updated, original_ending)

        return updated, replacements_done, None

    def _edit_file(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not self.file_state.content:
            return ToolExecutionResult(
                ok=False,
                result={"error": "No file exists yet. Call create_file first."},
                summary={"error": "No file to edit"},
            )

        edits = args.get("edits")
        if not edits:
            old_text = ensure_str(args.get("old_text"))
            new_text = ensure_str(args.get("new_text"))
            count = args.get("count")
            edits = [{"old_text": old_text, "new_text": new_text, "count": count}]

        if not isinstance(edits, list):
            return ToolExecutionResult(
                ok=False,
                result={"error": "edits must be a list"},
                summary={"error": "Invalid edits payload"},
            )

        raw_content = self.file_state.content
        content, bom = strip_bom(raw_content)
        summary_edits: List[Dict[str, Any]] = []
        for edit in edits:
            old_text = ensure_str(edit.get("old_text"))
            new_text = ensure_str(edit.get("new_text"))
            count = edit.get("count")
            if not old_text:
                return ToolExecutionResult(
                    ok=False,
                    result={"error": "edit_file requires old_text"},
                    summary={"error": "Missing old_text"},
                )

            content, replaced, error_msg = self._apply_single_edit(
                content, old_text, new_text, count
            )
            if error_msg:
                return ToolExecutionResult(
                    ok=False,
                    result={"error": error_msg, "old_text": old_text},
                    summary={
                        "error": error_msg,
                        "old_text": summarize_text(old_text, 160),
                    },
                )
            if replaced == 0:
                return ToolExecutionResult(
                    ok=False,
                    result={
                        "error": (
                            "Could not find the exact text. The old_text must "
                            "match exactly including all whitespace and newlines."
                        ),
                        "old_text": old_text,
                    },
                    summary={
                        "error": "old_text not found",
                        "old_text": summarize_text(old_text, 160),
                    },
                )

            summary_edits.append(
                {
                    "old_text": summarize_text(old_text, 140),
                    "new_text": summarize_text(new_text, 140),
                    "replaced": replaced,
                }
            )

        final_content = bom + content
        old_normalized = normalize_to_lf(raw_content)
        new_normalized = normalize_to_lf(final_content)
        diff_str, first_changed_line = generate_diff_string(
            old_normalized, new_normalized
        )

        self.file_state.content = final_content
        summary = {
            "path": self.file_state.path,
            "edits": summary_edits,
            "contentLength": len(self.file_state.content),
        }
        result: Dict[str, Any] = {
            "path": self.file_state.path,
            "content": self.file_state.content,
        }
        if diff_str:
            result["diff"] = diff_str
        if first_changed_line is not None:
            result["firstChangedLine"] = first_changed_line
        return ToolExecutionResult(
            ok=True,
            result=result,
            summary=summary,
            updated_content=self.file_state.content,
        )

    async def _generate_images(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not self.should_generate_images:
            return ToolExecutionResult(
                ok=False,
                result={"error": "Image generation is disabled."},
                summary={"error": "Image generation disabled"},
            )

        prompts = args.get("prompts") or []
        if not isinstance(prompts, list) or not prompts:
            return ToolExecutionResult(
                ok=False,
                result={"error": "generate_images requires a non-empty prompts list"},
                summary={"error": "Missing prompts"},
            )

        cleaned = [prompt.strip() for prompt in prompts if isinstance(prompt, str)]
        unique_prompts = list(dict.fromkeys([p for p in cleaned if p]))
        if not unique_prompts:
            return ToolExecutionResult(
                ok=False,
                result={"error": "No valid prompts provided"},
                summary={"error": "No valid prompts"},
            )
        if REPLICATE_API_KEY:
            model = "flux"
            api_key = REPLICATE_API_KEY
            base_url = None
        else:
            if not self.openai_api_key:
                return ToolExecutionResult(
                    ok=False,
                    result={"error": "No API key available for image generation."},
                    summary={"error": "Missing image generation API key"},
                )
            model = "dalle3"
            api_key = self.openai_api_key
            base_url = self.openai_base_url

        generated = await process_tasks(unique_prompts, api_key, base_url, model)  # type: ignore
        merged_results = {
            prompt: url for prompt, url in zip(unique_prompts, generated)
        }
        summary_items = [
            {
                "prompt": prompt,
                "url": url,
                "status": "ok" if url else "error",
            }
            for prompt, url in merged_results.items()
        ]
        result = {"images": merged_results}
        summary = {"images": summary_items}
        return ToolExecutionResult(ok=True, result=result, summary=summary)

    async def _remove_background(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not REPLICATE_API_KEY:
            return ToolExecutionResult(
                ok=False,
                result={"error": "Background removal requires REPLICATE_API_KEY."},
                summary={"error": "Missing Replicate API key"},
            )

        image_url = ensure_str(args.get("image_url"))
        if not image_url:
            return ToolExecutionResult(
                ok=False,
                result={"error": "remove_background requires an image_url"},
                summary={"error": "Missing image_url"},
            )

        try:
            result_url = await remove_background(image_url, REPLICATE_API_KEY)
            result = {"image_url": image_url, "result_url": result_url}
            summary = {
                "image_url": summarize_text(image_url, 100),
                "result_url": result_url,
                "status": "ok",
            }
            return ToolExecutionResult(ok=True, result=result, summary=summary)
        except Exception as exc:
            return ToolExecutionResult(
                ok=False,
                result={"error": str(exc), "image_url": image_url},
                summary={"error": summarize_text(str(exc), 100)},
            )

    def _retrieve_option(self, args: Dict[str, Any]) -> ToolExecutionResult:
        raw_option_number = args.get("option_number")
        raw_index = args.get("index")

        def coerce_int(value: Any) -> Optional[int]:
            if value is None:
                return None
            try:
                return int(value)
            except (TypeError, ValueError):
                return None

        option_number = coerce_int(raw_option_number)
        index = coerce_int(raw_index)

        if option_number is None and index is None:
            return ToolExecutionResult(
                ok=False,
                result={"error": "retrieve_option requires option_number"},
                summary={"error": "Missing option_number"},
            )

        resolved_index = index if option_number is None else option_number - 1
        if resolved_index is None:
            return ToolExecutionResult(
                ok=False,
                result={"error": "Invalid option_number"},
                summary={"error": "Invalid option_number"},
            )

        if resolved_index < 0 or resolved_index >= len(self.option_codes):
            return ToolExecutionResult(
                ok=False,
                result={
                    "error": "Option index out of range",
                    "option_number": resolved_index + 1,
                    "available": len(self.option_codes),
                },
                summary={
                    "error": "Option index out of range",
                    "available": len(self.option_codes),
                },
            )

        code = ensure_str(self.option_codes[resolved_index])
        if not code.strip():
            return ToolExecutionResult(
                ok=False,
                result={
                    "error": "Option code is empty or unavailable",
                    "option_number": resolved_index + 1,
                },
                summary={"error": "Option code unavailable"},
            )

        summary = {
            "option_number": resolved_index + 1,
            "contentLength": len(code),
            "preview": summarize_text(code, 200),
        }
        result = {"option_number": resolved_index + 1, "code": code}
        return ToolExecutionResult(ok=True, result=result, summary=summary)


# Backwards-compatible alias for older imports.
AgentToolbox = AgentToolRuntime
