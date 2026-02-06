import base64
from typing import Any, Dict, List

from google.genai import types
from openai.types.chat import ChatCompletionMessageParam

from llm import Llm


DEFAULT_VIDEO_FPS = 10


def get_gemini_api_model_name(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]:
        return "gemini-3-flash-preview"
    if model in [Llm.GEMINI_3_PRO_PREVIEW_HIGH, Llm.GEMINI_3_PRO_PREVIEW_LOW]:
        return "gemini-3-pro-preview"
    return model.value


def get_thinking_level_for_model(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_PRO_PREVIEW_HIGH]:
        return "high"
    if model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        return "low"
    if model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        return "minimal"
    return "high"


def _extract_text_from_content(content: str | List[Dict[str, Any]]) -> str:
    if isinstance(content, str):
        return content

    for content_part in content:
        if content_part.get("type") == "text":
            return content_part.get("text", "")

    return ""


def _detect_mime_type_from_base64(base64_data: str) -> str | None:
    try:
        decoded = base64.b64decode(base64_data[:32])

        if decoded[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        if decoded[:2] == b"\xff\xd8":
            return "image/jpeg"
        if decoded[:6] in (b"GIF87a", b"GIF89a"):
            return "image/gif"
        if decoded[:4] == b"RIFF" and decoded[8:12] == b"WEBP":
            return "image/webp"

        if decoded[4:8] == b"ftyp":
            return "video/mp4"
        if decoded[:4] == b"\x1aE\xdf\xa3":
            return "video/webm"
    except Exception:
        pass

    return None


def _extract_images_from_content(content: str | List[Dict[str, Any]]) -> List[Dict[str, str]]:
    if isinstance(content, str):
        return []

    images: List[Dict[str, str]] = []
    for content_part in content:
        if content_part.get("type") != "image_url":
            continue

        image_url = content_part["image_url"]["url"]
        if image_url.startswith("data:"):
            mime_type = image_url.split(";")[0].split(":")[1]
            base64_data = image_url.split(",")[1]

            if mime_type == "application/octet-stream":
                detected_mime = _detect_mime_type_from_base64(base64_data)
                if detected_mime:
                    mime_type = detected_mime
                else:
                    print("Warning: Could not detect MIME type for data URL, skipping")
                    continue

            images.append({"mime_type": mime_type, "data": base64_data})
            continue

        images.append({"uri": image_url})

    return images


def convert_message_to_gemini_content(
    message: ChatCompletionMessageParam,
) -> types.Content:
    role = message.get("role", "user")
    content = message.get("content", "")
    gemini_role = "model" if role == "assistant" else "user"

    parts: List[types.Part | Dict[str, str]] = []

    text = _extract_text_from_content(content)  # type: ignore
    image_data_list = _extract_images_from_content(content)  # type: ignore

    if text:
        parts.append({"text": text})

    for image_data in image_data_list:
        if "data" in image_data:
            mime_type = image_data["mime_type"]
            media_bytes = base64.b64decode(image_data["data"])
            if mime_type.startswith("video/"):
                parts.append(
                    types.Part(
                        inline_data=types.Blob(data=media_bytes, mime_type=mime_type),
                        video_metadata=types.VideoMetadata(fps=DEFAULT_VIDEO_FPS),
                        media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH,
                    )
                )
                continue

            parts.append(
                types.Part.from_bytes(
                    data=media_bytes,
                    mime_type=mime_type,
                    media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
                )
            )
            continue

        if "uri" in image_data:
            parts.append({"file_uri": image_data["uri"]})

    return types.Content(role=gemini_role, parts=parts)  # type: ignore
