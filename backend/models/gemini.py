import base64
import time
from typing import Any, Awaitable, Callable, Dict, List
from openai.types.chat import ChatCompletionMessageParam
from google import genai
from google.genai import types
from llm import Completion, Llm
from image_generation.core import generate_image_replicate

# Set to True to print debug messages for Gemini requests
DEBUG_GEMINI = False

# Image generation function declaration for Gemini tool calling
IMAGE_GENERATION_FUNCTION = {
    "name": "generate_image",
    "description": "Generates an image based on a text prompt. Use this tool when you need to create a real image for the app instead of using a placeholder. The tool returns a URL to the generated image.",
    "parameters": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "A detailed description of the image to generate. Be specific about colors, composition, style, and content."
            },
            "image_id": {
                "type": "string",
                "description": "A unique identifier for this image (e.g., 'hero-image', 'product-1', 'avatar'). This helps track which image is which."
            }
        },
        "required": ["prompt", "image_id"],
    },
}


async def execute_image_generation(
    prompt: str,
    image_id: str,
    replicate_api_key: str,
) -> Dict[str, str]:
    try:
        print(f"Generating image '{image_id}': {prompt[:100]}...")
        image_url = await generate_image_replicate(prompt, replicate_api_key)
        print(f"Generated image '{image_id}': {image_url}")
        return {
            "status": "success",
            "image_id": image_id,
            "url": image_url,
        }
    except Exception as e:
        print(f"Error generating image '{image_id}': {e}")
        return {
            "status": "error",
            "image_id": image_id,
            "error": str(e),
            "fallback_url": f"https://placehold.co/800x600?text={image_id}",
        }


def get_gemini_api_model_name(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]:
        return "gemini-3-flash-preview"
    elif model in [Llm.GEMINI_3_PRO_PREVIEW_HIGH, Llm.GEMINI_3_PRO_PREVIEW_LOW]:
        return "gemini-3-pro-preview"
    return model.value


def extract_text_from_content(content: str | List[Dict[str, Any]]) -> str:
    """
    Extracts text from message content, handling both string and list formats.
    """
    if isinstance(content, str):
        return content

    # Content is a list of content parts - find the text part
    for content_part in content:
        if content_part.get("type") == "text":
            return content_part.get("text", "")

    return ""


def detect_mime_type_from_base64(base64_data: str) -> str | None:
    """
    Detect MIME type from base64 data by checking magic bytes.
    Returns detected MIME type or None if unknown.
    """
    try:
        # Decode first few bytes to check magic numbers
        decoded = base64.b64decode(base64_data[:32])

        # Check for common image formats
        if decoded[:8] == b'\x89PNG\r\n\x1a\n':
            return "image/png"
        if decoded[:2] == b'\xff\xd8':
            return "image/jpeg"
        if decoded[:6] in (b'GIF87a', b'GIF89a'):
            return "image/gif"
        if decoded[:4] == b'RIFF' and decoded[8:12] == b'WEBP':
            return "image/webp"

        # Check for video formats
        if decoded[4:8] == b'ftyp':
            # MP4/MOV file
            return "video/mp4"
        if decoded[:4] == b'\x1aE\xdf\xa3':
            # WebM file
            return "video/webm"
    except Exception:
        pass

    return None


def extract_image_from_content(content: str | List[Dict[str, Any]]) -> Dict[str, str] | None:
    """
    Extracts image data from message content.

    Args:
        content: Message content (string or list of content parts)

    Returns:
        Dictionary with mime_type and data keys for the first image found, or None if no image
    """
    # If content is a string, there's no image
    if isinstance(content, str):
        return None

    # Content is a list of content parts
    for content_part in content:
        if content_part.get("type") == "image_url":
            image_url = content_part["image_url"]["url"]
            if image_url.startswith("data:"):
                # Extract base64 data and mime type for data URLs
                mime_type = image_url.split(";")[0].split(":")[1]
                base64_data = image_url.split(",")[1]

                # If MIME type is generic, try to detect from data
                if mime_type == "application/octet-stream":
                    detected_mime = detect_mime_type_from_base64(base64_data)
                    if detected_mime:
                        mime_type = detected_mime
                    else:
                        # Skip this content if we can't determine the type
                        print(f"Warning: Could not detect MIME type for data URL, skipping")
                        continue

                return {"mime_type": mime_type, "data": base64_data}
            else:
                # Handle regular URLs
                return {"uri": image_url}

    # No image found
    return None


def convert_message_to_gemini_content(
    message: ChatCompletionMessageParam,
) -> types.Content:
    """
    Convert an OpenAI-style message to Gemini Content format.
    """
    role = message.get("role", "user")
    content = message.get("content", "")

    # Map roles: OpenAI uses "assistant", Gemini uses "model"
    gemini_role = "model" if role == "assistant" else "user"

    parts: List[types.Part | Dict[str, str]] = []

    # Extract text and image from content
    text = extract_text_from_content(content)  # type: ignore
    image_data = extract_image_from_content(content)  # type: ignore

    if text:
        parts.append({"text": text})
    if image_data and "data" in image_data:
        parts.append(
            types.Part.from_bytes(
                data=base64.b64decode(image_data["data"]),
                mime_type=image_data["mime_type"],
                media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
            )
        )

    return types.Content(role=gemini_role, parts=parts)  # type: ignore


async def stream_gemini_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model: Llm,
    thinking_callback: Callable[[str], Awaitable[None]] | None = None,
) -> Completion:
    """
    Stream a response from Gemini.

    Message format (same as OpenAI/Claude):
    - messages[0]: System message with role="system", content=<system prompt string>
    - messages[1:]: User/assistant messages, where user messages may contain images

    This mirrors how Claude handles messages:
    - System prompt extracted from messages[0]
    - All conversation history from messages[1:] is converted to Gemini format
    """
    start_time = time.time()

    # Extract system prompt from first message (same as Claude)
    system_prompt = str(messages[0].get("content", ""))

    # Convert all messages after the system prompt to Gemini format
    # This includes the full conversation history for edits
    gemini_contents: List[types.Content] = []
    for msg in messages[1:]:
        gemini_contents.append(convert_message_to_gemini_content(msg))

    # Debug: print truncated message info
    if DEBUG_GEMINI:
        print(f"\n=== Gemini Request Debug ({model.value}) ===")
        print(f"System prompt (first 200 chars): {system_prompt[:200]}...")
        print(f"Number of conversation messages: {len(gemini_contents)}")
        for i, content in enumerate(gemini_contents):
            role = content.role
            text_preview = ""
            has_image = False
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    text_preview = part.text[:100]
                if hasattr(part, "inline_data") and part.inline_data:
                    has_image = True
            print(f"  [{i}] {role}: {text_preview}... (has_image={has_image})")
        print("=" * 50)

    client = genai.Client(api_key=api_key)
    full_response = ""

    if model == Llm.GEMINI_2_5_FLASH_PREVIEW_05_20:
        # Gemini 2.5 Flash supports thinking budgets
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=20000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_budget=5000, include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_HIGH:
        # Gemini 3 Flash with HIGH thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        # Gemini 3 Flash with MINIMAL thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="minimal", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_HIGH:
        # Gemini 3 Pro with HIGH thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        # Gemini 3 Pro with LOW thinking
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=30000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="low", include_thoughts=True
            ),
        )
    else:
        config = types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=8000,
            system_instruction=system_prompt,
        )

    # Map variant model names to actual API model names
    api_model_name = get_gemini_api_model_name(model)

    async for chunk in await client.aio.models.generate_content_stream(
        model=api_model_name,
        contents=gemini_contents,
        config=config,
    ):
        if chunk.candidates and len(chunk.candidates) > 0:
            for part in chunk.candidates[0].content.parts:
                if not part.text:
                    continue
                elif part.thought:
                    if thinking_callback:
                        await thinking_callback(part.text)
                    else:
                        print(f"\n=== Gemini Thinking Summary ({model.value}) ===")
                        print(part.text)
                        print("=" * 50)
                else:
                    full_response += part.text
                    await callback(part.text)

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}


async def stream_gemini_response_video(
    video_bytes: bytes,
    video_mime_type: str,
    system_prompt: str,
    api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model: Llm,
    thinking_callback: Callable[[str], Awaitable[None]] | None = None,
) -> Completion:
    start_time = time.time()

    client = genai.Client(api_key=api_key)
    full_response = ""

    # Create content with video inline data at 10fps for better fidelity
    contents = types.Content(
        role="user",
        parts=[
            types.Part(
                inline_data=types.Blob(data=video_bytes, mime_type=video_mime_type),
                video_metadata=types.VideoMetadata(fps=20),
                media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH
            ),
            types.Part(text="Analyze this video and generate the code."),
        ],
    )

    # Configure based on model
    if model == Llm.GEMINI_3_FLASH_PREVIEW_HIGH:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="minimal", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_HIGH:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(
                thinking_level="low", include_thoughts=True
            ),
        )
    else:
        # Default config for other models
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
        )

    api_model_name = get_gemini_api_model_name(model)

    if DEBUG_GEMINI:
        print(f"\n=== Gemini Video Request Debug ({api_model_name}) ===")
        print(f"Video MIME type: {video_mime_type}")
        print(f"Video size: {len(video_bytes)} bytes")
        print(f"System prompt (first 200 chars): {system_prompt[:200]}...")
        print("=" * 50)

    async for chunk in await client.aio.models.generate_content_stream(
        model=api_model_name,
        contents=contents,
        config=config,
    ):
        if chunk.candidates and len(chunk.candidates) > 0:
            for part in chunk.candidates[0].content.parts:
                if not part.text:
                    continue
                elif part.thought:
                    if thinking_callback:
                        await thinking_callback(part.text)
                    else:
                        print(f"\n=== Gemini Video Thinking Summary ({api_model_name}) ===")
                        print(part.text)
                        print("=" * 50)
                else:
                    full_response += part.text
                    await callback(part.text)

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}


async def stream_gemini_response_video_with_tools(
    video_bytes: bytes,
    video_mime_type: str,
    system_prompt: str,
    api_key: str,
    replicate_api_key: str,
    callback: Callable[[str], Awaitable[None]],
    model: Llm,
    thinking_callback: Callable[[str], Awaitable[None]] | None = None,
) -> Completion:
    start_time = time.time()

    client = genai.Client(api_key=api_key)
    full_response = ""
    generated_images: Dict[str, str] = {}

    # Create initial content with video
    contents: List[types.Content] = [
        types.Content(
            role="user",
            parts=[
                types.Part(
                    inline_data=types.Blob(data=video_bytes, mime_type=video_mime_type),
                    video_metadata=types.VideoMetadata(fps=20),
                    media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH
                ),
                types.Part(text="Analyze this video and generate the code. Use the generate_image tool to create real images for any images you see in the video."),
            ],
        )
    ]

    # Set up the image generation tool
    tools = types.Tool(function_declarations=[IMAGE_GENERATION_FUNCTION])

    # Configure based on model - with tools
    if model == Llm.GEMINI_3_FLASH_PREVIEW_HIGH:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            tools=[tools],
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            tools=[tools],
            thinking_config=types.ThinkingConfig(
                thinking_level="minimal", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_HIGH:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            tools=[tools],
            thinking_config=types.ThinkingConfig(
                thinking_level="high", include_thoughts=True
            ),
        )
    elif model == Llm.GEMINI_3_PRO_PREVIEW_LOW:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            tools=[tools],
            thinking_config=types.ThinkingConfig(
                thinking_level="low", include_thoughts=True
            ),
        )
    else:
        config = types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=50000,
            system_instruction=system_prompt,
            tools=[tools],
        )

    api_model_name = get_gemini_api_model_name(model)

    print(f"\n{'='*60}")
    print(f"[GEMINI VIDEO WITH TOOLS] Starting generation")
    print(f"  Model: {api_model_name}")
    print(f"  Video MIME type: {video_mime_type}")
    print(f"  Video size: {len(video_bytes)} bytes")
    print(f"  Tools enabled: generate_image")
    print(f"{'='*60}")

    # Function calling loop - use non-streaming for function calls
    max_iterations = 20  # Safety limit to prevent infinite loops
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        print(f"\n[ITERATION {iteration}/{max_iterations}] Making API call...")

        # Make the API call (non-streaming to handle function calls properly)
        response = await client.aio.models.generate_content(
            model=api_model_name,
            contents=contents,
            config=config,
        )

        if not response.candidates or len(response.candidates) == 0:
            print("No candidates in response")
            break

        candidate = response.candidates[0]

        # Check if there are function calls
        function_calls = []
        text_parts = []

        for part in candidate.content.parts:
            if hasattr(part, "function_call") and part.function_call:
                function_calls.append(part.function_call)
            elif hasattr(part, "thought") and part.thought and part.text:
                # Handle thinking content
                if thinking_callback:
                    await thinking_callback(part.text)
                else:
                    print(f"\n=== Gemini Video Thinking ({api_model_name}) ===")
                    print(part.text[:500] + "..." if len(part.text) > 500 else part.text)
                    print("=" * 50)
            elif hasattr(part, "text") and part.text:
                text_parts.append(part.text)

        # If there are function calls, execute them and continue
        if function_calls:
            print(f"\n{'='*60}")
            print(f"[TOOL CALL] Processing {len(function_calls)} function call(s)...")
            print(f"{'='*60}")

            # Append the model's response to contents
            contents.append(candidate.content)

            # Process each function call and collect responses
            function_response_parts = []
            for i, fc in enumerate(function_calls):
                print(f"\n[TOOL CALL {i+1}/{len(function_calls)}]")
                print(f"  Function: {fc.name}")
                print(f"  Args: {fc.args}")

                if fc.name == "generate_image":
                    args = fc.args
                    prompt = args.get("prompt", "")
                    image_id = args.get("image_id", f"image-{len(generated_images)}")

                    print(f"  Image ID: {image_id}")
                    print(f"  Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")

                    # Execute image generation
                    result = await execute_image_generation(
                        prompt=prompt,
                        image_id=image_id,
                        replicate_api_key=replicate_api_key,
                    )

                    # Track generated images
                    if result["status"] == "success":
                        generated_images[image_id] = result["url"]
                        print(f"  [SUCCESS] Generated URL: {result['url']}")
                    else:
                        generated_images[image_id] = result.get("fallback_url", "")
                        print(f"  [ERROR] {result.get('error', 'Unknown error')}")
                        print(f"  [FALLBACK] Using: {result.get('fallback_url', 'N/A')}")

                    # Create function response part
                    function_response_parts.append(
                        types.Part.from_function_response(
                            name=fc.name,
                            response={"result": result},
                        )
                    )
                else:
                    print(f"Unknown function: {fc.name}")
                    function_response_parts.append(
                        types.Part.from_function_response(
                            name=fc.name,
                            response={"error": f"Unknown function: {fc.name}"},
                        )
                    )

            # Append function responses to contents
            contents.append(
                types.Content(role="user", parts=function_response_parts)
            )

            # Continue the loop to get the next response
            continue

        # No function calls - we have the final text response
        if text_parts:
            full_response = "".join(text_parts)
            print(f"\n[FINAL RESPONSE] Received {len(full_response)} characters of HTML code")
            # Stream the response to the callback
            await callback(full_response)
            break

    if iteration >= max_iterations:
        print(f"Warning: Reached max iterations ({max_iterations})")

    print(f"\n{'='*60}")
    print(f"[GEMINI VIDEO WITH TOOLS] Generation Complete")
    print(f"  Total iterations: {iteration}")
    print(f"  Images generated: {len(generated_images)}")
    for img_id, url in generated_images.items():
        print(f"    - {img_id}: {url[:80]}{'...' if len(url) > 80 else ''}")
    print(f"{'='*60}")

    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": full_response}
