# pyright: reportUnknownVariableType=false
import asyncio
import difflib
from typing import Any, Dict, List, Optional, Tuple, Union, cast

from codegen.utils import extract_html_content
from config import REPLICATE_API_KEY
from agent.tools.extract_assets import run_extract_assets
from agent.tools.local_assets import guess_image_mime, local_asset_url_to_data_url
from agent.tools.screenshot_preview import run_screenshot_preview
from image_generation.generation import process_tasks
from image_generation.replicate import (
    P_IMAGE_EDIT_ASPECT_RATIOS,
    PImageEditAspectRatio,
    edit_image,
    remove_background,
)
from uploaded_assets.tools import run_save_assets

from agent.state import AgentFileState, ensure_str
from agent.tools.types import ToolCall, ToolExecutionResult, ToolMultimodalPart
from agent.tools.summaries import summarize_text


class AgentToolRuntime:
    def __init__(
        self,
        file_state: AgentFileState,
        should_generate_images: bool,
        openai_api_key: Optional[str],
        openai_base_url: Optional[str],
        gemini_api_key: Optional[str] = None,
        input_images: Optional[List[str]] = None,
        asset_base_url: str = "",
        user_id: Optional[str] = None,
        option_codes: Optional[List[str]] = None,
    ):
        self.file_state = file_state
        self.should_generate_images = should_generate_images
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.gemini_api_key = gemini_api_key
        self.input_images = input_images or []
        self.asset_base_url = asset_base_url
        self.user_id = user_id
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
        if tool_call.name == "edit_image":
            return await self._edit_image(tool_call.arguments)
        if tool_call.name == "extract_assets":
            return await run_extract_assets(
                tool_call.arguments,
                gemini_api_key=self.gemini_api_key,
                input_images=self.input_images,
                asset_base_url=self.asset_base_url,
                user_id=self.user_id,
            )
        if tool_call.name == "screenshot_preview":
            return await run_screenshot_preview(
                tool_call.arguments,
                file_state=self.file_state,
                asset_base_url=self.asset_base_url,
            )
        if tool_call.name == "save_assets":
            return await run_save_assets(tool_call.arguments, user_id=self.user_id)
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

    @staticmethod
    def _generate_diff(old_content: str, new_content: str, path: str) -> Dict[str, Any]:
        """Generate a unified diff between old and new content."""
        old_lines = old_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        diff_lines = list(
            difflib.unified_diff(old_lines, new_lines, fromfile=path, tofile=path)
        )
        diff_str = "".join(diff_lines)

        first_changed_line: Optional[int] = None
        for line in diff_lines:
            if not line.startswith("@@"):
                continue
            try:
                plus_part = line.split("+")[1].split("@@")[0].strip()
                first_changed_line = int(plus_part.split(",")[0])
            except (IndexError, ValueError):
                pass
            break

        return {
            "diff": diff_str,
            "firstChangedLine": first_changed_line,
        }

    def _apply_single_edit(
        self,
        content: str,
        old_text: str,
        new_text: str,
        count: Optional[int],
    ) -> Tuple[str, int]:
        if old_text not in content:
            return content, 0

        if count is None:
            replace_count = 1
        elif count < 0:
            replace_count = content.count(old_text)
        else:
            replace_count = count

        updated = content.replace(old_text, new_text, replace_count)
        return updated, min(replace_count, content.count(old_text))

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

        content = self.file_state.content
        original_content = content
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

            content, replaced = self._apply_single_edit(content, old_text, new_text, count)
            if replaced == 0:
                return ToolExecutionResult(
                    ok=False,
                    result={"error": "old_text not found", "old_text": old_text},
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

        self.file_state.content = content
        path = self.file_state.path or "index.html"
        diff_info = self._generate_diff(original_content, content, path)
        summary = {
            "path": path,
            "edits": summary_edits,
            "contentLength": len(self.file_state.content),
            "diff": diff_info["diff"],
            "firstChangedLine": diff_info["firstChangedLine"],
        }
        result = {
            "content": f"Successfully edited file at {path}.",
            "details": {
                "diff": diff_info["diff"],
                "firstChangedLine": diff_info["firstChangedLine"],
            },
        }
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
        multimodal_parts = [
            ToolMultimodalPart(
                display_name=f"generated_{index}.png",
                mime_type=guess_image_mime(url),
                image_url=url,
            )
            for index, url in enumerate(merged_results.values())
            if url
        ]
        return ToolExecutionResult(
            ok=True,
            result=result,
            summary=summary,
            multimodal_parts=multimodal_parts,
        )

    async def _remove_background(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not REPLICATE_API_KEY:
            return ToolExecutionResult(
                ok=False,
                result={"error": "Background removal requires REPLICATE_API_KEY."},
                summary={"error": "Missing Replicate API key"},
            )

        image_urls = args.get("image_urls") or []
        if not isinstance(image_urls, list) or not image_urls:
            return ToolExecutionResult(
                ok=False,
                result={
                    "error": "remove_background requires a non-empty image_urls list"
                },
                summary={"error": "Missing image_urls"},
            )

        cleaned = [url.strip() for url in image_urls if isinstance(url, str)]
        unique_urls = list(dict.fromkeys([u for u in cleaned if u]))
        if not unique_urls:
            return ToolExecutionResult(
                ok=False,
                result={"error": "No valid image URLs provided"},
                summary={"error": "No valid image_urls"},
            )

        batch_size = 20
        raw_results: list[str | BaseException] = []
        for i in range(0, len(unique_urls), batch_size):
            batch = unique_urls[i : i + batch_size]
            # Replicate can't fetch localhost; inline local assets as data URLs.
            tasks = [
                remove_background(local_asset_url_to_data_url(url), REPLICATE_API_KEY)
                for url in batch
            ]
            raw_results.extend(await asyncio.gather(*tasks, return_exceptions=True))

        results: List[Dict[str, Any]] = []
        for url, raw in zip(unique_urls, raw_results):
            if isinstance(raw, BaseException):
                print(f"Background removal failed for {url}: {raw}")
                results.append(
                    {"image_url": url, "result_url": None, "status": "error"}
                )
            else:
                results.append(
                    {"image_url": url, "result_url": raw, "status": "ok"}
                )

        summary_items = [
            {
                "image_url": summarize_text(r["image_url"], 100),
                "result_url": r["result_url"],
                "status": r["status"],
            }
            for r in results
        ]
        multimodal_parts = [
            ToolMultimodalPart(
                display_name=f"no_bg_{index}.png",
                mime_type=guess_image_mime(result["result_url"]),
                image_url=result["result_url"],
            )
            for index, result in enumerate(results)
            if result["status"] == "ok" and result["result_url"]
        ]
        return ToolExecutionResult(
            ok=True,
            result={"images": results},
            summary={"images": summary_items},
            multimodal_parts=multimodal_parts,
        )

    async def _edit_image(self, args: Dict[str, Any]) -> ToolExecutionResult:
        if not REPLICATE_API_KEY:
            return ToolExecutionResult(
                ok=False,
                result={"error": "Image editing requires REPLICATE_API_KEY."},
                summary={"error": "Missing Replicate API key"},
            )

        prompt = ensure_str(args.get("prompt")).strip()
        if not prompt:
            return ToolExecutionResult(
                ok=False,
                result={"error": "edit_image requires a non-empty prompt"},
                summary={"error": "Missing prompt"},
            )

        image_urls = args.get("image_urls") or args.get("images") or []
        if not isinstance(image_urls, list) or not image_urls:
            return ToolExecutionResult(
                ok=False,
                result={"error": "edit_image requires a non-empty image_urls list"},
                summary={"error": "Missing image_urls"},
            )

        cleaned = [url.strip() for url in image_urls if isinstance(url, str)]
        unique_urls = list(dict.fromkeys([u for u in cleaned if u]))
        if not unique_urls:
            return ToolExecutionResult(
                ok=False,
                result={"error": "No valid image URLs provided"},
                summary={"error": "No valid image_urls"},
            )

        aspect_ratio_value = ensure_str(args.get("aspect_ratio") or "match_input_image")
        if aspect_ratio_value not in P_IMAGE_EDIT_ASPECT_RATIOS:
            aspect_ratio_value = "match_input_image"
        aspect_ratio = cast(PImageEditAspectRatio, aspect_ratio_value)

        try:
            result_url = await edit_image(
                prompt=prompt,
                image_urls=[local_asset_url_to_data_url(url) for url in unique_urls],
                api_token=REPLICATE_API_KEY,
                aspect_ratio=aspect_ratio,
            )
        except Exception as exc:
            print(f"Image edit failed for {unique_urls}: {exc}")
            return ToolExecutionResult(
                ok=True,
                result={
                    "image": {
                        "prompt": prompt,
                        "image_urls": unique_urls,
                        "result_url": None,
                        "status": "error",
                    }
                },
                summary={
                    "image": {
                        "prompt": summarize_text(prompt, 240),
                        "image_urls": [summarize_text(url, 100) for url in unique_urls],
                        "result_url": None,
                        "status": "error",
                    }
                },
            )

        result = {
            "image": {
                "prompt": prompt,
                "image_urls": unique_urls,
                "result_url": result_url,
                "status": "ok",
                "aspect_ratio": aspect_ratio,
            }
        }
        summary = {
            "image": {
                "prompt": summarize_text(prompt, 240),
                "image_urls": [summarize_text(url, 100) for url in unique_urls],
                "result_url": result_url,
                "status": "ok",
                "aspect_ratio": aspect_ratio,
            }
        }
        return ToolExecutionResult(
            ok=True,
            result=result,
            summary=summary,
            multimodal_parts=[
                ToolMultimodalPart(
                    display_name="edited.png",
                    mime_type=guess_image_mime(result_url),
                    image_url=result_url,
                )
            ],
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
