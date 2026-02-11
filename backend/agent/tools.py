# pyright: reportUnknownVariableType=false
import copy
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from google.genai import types

from codegen.utils import extract_html_content
from config import REPLICATE_API_KEY
from image_generation.generation import process_tasks
from image_generation.replicate import remove_background

from agent.state import AgentFileState, ensure_str


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ToolExecutionResult:
    ok: bool
    result: Dict[str, Any]
    summary: Dict[str, Any]
    updated_content: Optional[str] = None


@dataclass(frozen=True)
class CanonicalToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]


def summarize_text(value: str, limit: int = 240) -> str:
    if len(value) <= limit:
        return value
    return value[:limit] + "..."


def parse_json_arguments(raw_args: Any) -> Tuple[Dict[str, Any], Optional[str]]:
    if isinstance(raw_args, dict):
        return raw_args, None
    if raw_args is None:
        return {}, None
    raw_text = ensure_str(raw_args).strip()
    if not raw_text:
        return {}, None
    try:
        return json.loads(raw_text), None
    except json.JSONDecodeError as exc:
        return {}, f"Invalid JSON arguments: {exc}"


def _strip_incomplete_escape(value: str) -> str:
    if not value:
        return value
    trailing = 0
    for ch in reversed(value):
        if ch == "\\":
            trailing += 1
        else:
            break
    if trailing % 2 == 1:
        return value[:-1]
    return value


def _extract_partial_json_string(raw_text: str, key: str) -> Optional[str]:
    if not raw_text:
        return None
    token = f'"{key}"'
    idx = raw_text.find(token)
    if idx == -1:
        return None
    colon = raw_text.find(":", idx + len(token))
    if colon == -1:
        return None
    cursor = colon + 1
    while cursor < len(raw_text) and raw_text[cursor].isspace():
        cursor += 1
    if cursor >= len(raw_text) or raw_text[cursor] != '"':
        return None

    start = cursor + 1
    last_quote: Optional[int] = None
    cursor = start
    while cursor < len(raw_text):
        if raw_text[cursor] == '"':
            backslashes = 0
            back = cursor - 1
            while back >= start and raw_text[back] == "\\":
                backslashes += 1
                back -= 1
            if backslashes % 2 == 0:
                last_quote = cursor
        cursor += 1

    partial = raw_text[start:] if last_quote is None else raw_text[start:last_quote]
    partial = _strip_incomplete_escape(partial)
    if not partial:
        return ""

    try:
        return json.loads(f'"{partial}"')
    except Exception:
        return (
            partial.replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\r", "\r")
            .replace('\\"', '"')
            .replace("\\\\", "\\")
        )


def extract_content_from_args(raw_args: Any) -> Optional[str]:
    if isinstance(raw_args, dict):
        content = raw_args.get("content")
        if content is None:
            return None
        return ensure_str(content)
    raw_text = ensure_str(raw_args)
    return _extract_partial_json_string(raw_text, "content")


def extract_path_from_args(raw_args: Any) -> Optional[str]:
    if isinstance(raw_args, dict):
        path = raw_args.get("path")
        return ensure_str(path) if path is not None else None
    raw_text = ensure_str(raw_args)
    return _extract_partial_json_string(raw_text, "path")


def _create_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path for the main HTML file. Use index.html if unsure.",
            },
            "content": {
                "type": "string",
                "description": "Full HTML for the single-file app.",
            },
        },
        "required": ["content"],
    }


def _edit_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path for the main HTML file.",
            },
            "old_text": {
                "type": "string",
                "description": "Exact text to replace. Must match the file contents.",
            },
            "new_text": {
                "type": "string",
                "description": "Replacement text.",
            },
            "count": {
                "type": "integer",
                "description": "How many occurrences to replace. Use -1 for all.",
            },
            "edits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "old_text": {"type": "string"},
                        "new_text": {"type": "string"},
                        "count": {"type": "integer"},
                    },
                    "required": ["old_text", "new_text"],
                },
            },
        },
    }


def _image_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "prompts": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "Prompt describing a single image to generate.",
                },
            }
        },
        "required": ["prompts"],
    }


def _remove_background_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "image_url": {
                "type": "string",
                "description": "URL of the image to remove the background from.",
            },
        },
        "required": ["image_url"],
    }


def _retrieve_option_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "option_number": {
                "type": "integer",
                "description": "1-based option number to retrieve (Option 1, Option 2, etc.).",
            }
        },
        "required": ["option_number"],
    }


def canonical_tool_definitions() -> List[CanonicalToolDefinition]:
    return [
        CanonicalToolDefinition(
            name="create_file",
            description=(
                "Create the main HTML file for the app. Use exactly once to write the "
                "full HTML. Returns the updated file content."
            ),
            parameters=_create_schema(),
        ),
        CanonicalToolDefinition(
            name="edit_file",
            description=(
                "Edit the main HTML file using exact string replacements. Do not "
                "regenerate the entire file. Returns the updated file content."
            ),
            parameters=_edit_schema(),
        ),
        CanonicalToolDefinition(
            name="generate_images",
            description=(
                "Generate image URLs from prompts. Use to replace placeholder images. "
                "You can pass multiple prompts at once."
            ),
            parameters=_image_schema(),
        ),
        CanonicalToolDefinition(
            name="remove_background",
            description=(
                "Remove the background from an image. Returns a URL to the processed "
                "image with transparent background."
            ),
            parameters=_remove_background_schema(),
        ),
        CanonicalToolDefinition(
            name="retrieve_option",
            description=(
                "Retrieve the full HTML for a specific option (variant) so you can "
                "reference it."
            ),
            parameters=_retrieve_option_schema(),
        ),
    ]


def _copy_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    return copy.deepcopy(schema)


def _nullable_type(type_value: Any) -> Any:
    if isinstance(type_value, list):
        if "null" not in type_value:
            return [*type_value, "null"]
        return type_value
    if isinstance(type_value, str):
        return [type_value, "null"]
    return type_value


def _make_responses_schema_strict(schema: Dict[str, Any]) -> Dict[str, Any]:
    schema_copy: Dict[str, Any] = _copy_schema(schema)

    def transform(node: Dict[str, Any], in_object_property: bool = False) -> None:
        node_type = node.get("type")

        if node_type == "object":
            node["additionalProperties"] = False
            properties = node.get("properties") or {}
            if isinstance(properties, dict):
                node["required"] = list(properties.keys())
                for prop in properties.values():
                    if isinstance(prop, dict):
                        transform(prop, in_object_property=True)
            return

        if node_type == "array":
            if in_object_property:
                node["type"] = _nullable_type(node_type)
            items = node.get("items")
            if isinstance(items, dict):
                transform(items, in_object_property=False)
            return

        if in_object_property and node_type is not None:
            node["type"] = _nullable_type(node_type)

    transform(schema_copy, in_object_property=False)
    return schema_copy


def serialize_openai_responses_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for tool in tools:
        schema = _make_responses_schema_strict(tool.parameters)
        serialized.append(
            {
                "type": "function",
                "name": tool.name,
                "description": tool.description,
                "parameters": schema,
                "strict": True,
            }
        )
    return serialized


def serialize_anthropic_tools(
    tools: List[CanonicalToolDefinition],
) -> List[Dict[str, Any]]:
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "eager_input_streaming": True,
            "input_schema": _copy_schema(tool.parameters),
        }
        for tool in tools
    ]


def serialize_gemini_tools(
    tools: List[CanonicalToolDefinition],
) -> List[types.Tool]:
    declarations = [
        types.FunctionDeclaration(
            name=tool.name,
            description=tool.description,
            parameters_json_schema=_copy_schema(tool.parameters),
        )
        for tool in tools
    ]
    return [types.Tool(function_declarations=declarations)]


def summarize_tool_input(tool_call: ToolCall, file_state: AgentFileState) -> Dict[str, Any]:
    args = tool_call.arguments or {}

    if tool_call.name == "create_file":
        content = ensure_str(args.get("content"))
        return {
            "path": args.get("path") or file_state.path,
            "contentLength": len(content),
            "preview": summarize_text(content, 200),
        }

    if tool_call.name == "edit_file":
        edits = args.get("edits")
        if not edits:
            edits = [
                {
                    "old_text": args.get("old_text"),
                    "new_text": args.get("new_text"),
                    "count": args.get("count"),
                }
            ]
        summary_edits = []
        for edit in edits if isinstance(edits, list) else []:
            summary_edits.append(
                {
                    "old_text": summarize_text(ensure_str(edit.get("old_text")), 160),
                    "new_text": summarize_text(ensure_str(edit.get("new_text")), 160),
                    "count": edit.get("count"),
                }
            )
        return {
            "path": args.get("path") or file_state.path,
            "edits": summary_edits,
        }

    if tool_call.name == "generate_images":
        prompts = args.get("prompts") or []
        if isinstance(prompts, list):
            return {
                "count": len(prompts),
                "prompts": [ensure_str(p) for p in prompts],
            }

    if tool_call.name == "remove_background":
        image_url = ensure_str(args.get("image_url"))
        return {"image_url": summarize_text(image_url, 100)}

    if tool_call.name == "retrieve_option":
        return {
            "option_number": args.get("option_number"),
            "index": args.get("index"),
        }

    return args


class AgentToolbox:
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
            "path": self.file_state.path,
            "content": self.file_state.content,
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
        summary = {
            "path": self.file_state.path,
            "edits": summary_edits,
            "contentLength": len(self.file_state.content),
        }
        result = {
            "path": self.file_state.path,
            "content": self.file_state.content,
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
