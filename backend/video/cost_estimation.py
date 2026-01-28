from dataclasses import dataclass
from enum import Enum
from typing import Tuple
from llm import Llm


class MediaResolution(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class TokenEstimate:
    input_tokens: int
    estimated_output_tokens: int
    total_tokens: int


@dataclass
class CostEstimate:
    input_cost: float
    output_cost: float
    total_cost: float
    input_tokens: int
    output_tokens: int


# Gemini 3 video token rates per second (from documentation)
# https://ai.google.dev/gemini-api/docs/media-resolution#token-counts
# Note: Based on observed actual token counts, billing appears to use ~1 FPS
# even when higher fps is requested. This may vary - adjust if actuals differ.
VIDEO_TOKENS_PER_SECOND = {
    MediaResolution.LOW: 70,
    MediaResolution.MEDIUM: 70,  # Same as LOW for video
    MediaResolution.HIGH: 280,
}

# Audio tokens per second
AUDIO_TOKENS_PER_SECOND = 32

# System prompt + user text tokens (approximate)
# Based on actual usage: ~1400-1500 tokens for typical prompts
PROMPT_TOKENS_ESTIMATE = 1500

# Pricing per million tokens (USD)
# https://ai.google.dev/gemini-api/docs/pricing
GEMINI_PRICING = {
    # Gemini 3 Flash Preview
    "gemini-3-flash-preview": {
        "input_per_million": 0.50,  # text/image/video
        "output_per_million": 3.00,  # including thinking tokens
    },
    # Gemini 3 Pro Preview
    "gemini-3-pro-preview": {
        "input_per_million": 2.00,  # prompts <= 200k tokens
        "output_per_million": 12.00,  # including thinking tokens
    },
    # Gemini 2.5 Flash
    "gemini-2.5-flash": {
        "input_per_million": 0.30,  # text/image/video
        "output_per_million": 2.50,
    },
}


def get_model_api_name(model: Llm) -> str:
    if model in [Llm.GEMINI_3_FLASH_PREVIEW_HIGH, Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL]:
        return "gemini-3-flash-preview"
    elif model in [Llm.GEMINI_3_PRO_PREVIEW_HIGH, Llm.GEMINI_3_PRO_PREVIEW_LOW]:
        return "gemini-3-pro-preview"
    elif model == Llm.GEMINI_2_5_FLASH_PREVIEW_05_20:
        return "gemini-2.5-flash"
    return model.value


def estimate_video_input_tokens(
    video_duration_seconds: float,
    media_resolution: MediaResolution = MediaResolution.HIGH,
    include_audio: bool = True,
) -> int:
    # Estimate based on observed actual token counts (appears to bill at ~1 FPS)
    tokens_per_second = VIDEO_TOKENS_PER_SECOND[media_resolution]
    visual_tokens = int(video_duration_seconds * tokens_per_second)

    audio_tokens = 0
    if include_audio:
        audio_tokens = int(video_duration_seconds * AUDIO_TOKENS_PER_SECOND)

    # Add prompt tokens (system + user text)
    total_tokens = visual_tokens + audio_tokens + PROMPT_TOKENS_ESTIMATE

    return total_tokens


def estimate_output_tokens(
    max_output_tokens: int = 50000,
    thinking_level: str = "high",
) -> int:
    # Rough estimation: thinking takes up significant portion of output
    # High thinking: ~60-70% of output may be thinking tokens
    # Low thinking: ~30-40% of output may be thinking tokens
    # Minimal thinking: ~10-20% of output may be thinking tokens
    thinking_multipliers = {
        "high": 0.7,
        "low": 0.5,
        "minimal": 0.3,
    }

    multiplier = thinking_multipliers.get(thinking_level, 0.5)

    # Assume we use roughly 60% of max output tokens on average
    estimated_usage = int(max_output_tokens * 0.6)

    return estimated_usage


def calculate_cost(
    input_tokens: int,
    output_tokens: int,
    model: Llm,
) -> CostEstimate:
    model_name = get_model_api_name(model)
    pricing = GEMINI_PRICING.get(model_name, GEMINI_PRICING["gemini-3-flash-preview"])

    input_cost = (input_tokens / 1_000_000) * pricing["input_per_million"]
    output_cost = (output_tokens / 1_000_000) * pricing["output_per_million"]
    total_cost = input_cost + output_cost

    return CostEstimate(
        input_cost=input_cost,
        output_cost=output_cost,
        total_cost=total_cost,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )


def estimate_video_generation_cost(
    video_duration_seconds: float,
    model: Llm,
    media_resolution: MediaResolution = MediaResolution.HIGH,
    max_output_tokens: int = 50000,
    thinking_level: str = "high",
) -> CostEstimate:
    input_tokens = estimate_video_input_tokens(
        video_duration_seconds=video_duration_seconds,
        media_resolution=media_resolution,
        include_audio=True,
    )

    output_tokens = estimate_output_tokens(
        max_output_tokens=max_output_tokens,
        thinking_level=thinking_level,
    )

    return calculate_cost(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        model=model,
    )


def format_cost_estimate(cost: CostEstimate) -> str:
    return (
        f"Estimated Cost:\n"
        f"  Input tokens: {cost.input_tokens:,} (${cost.input_cost:.4f})\n"
        f"  Output tokens: {cost.output_tokens:,} (${cost.output_cost:.4f})\n"
        f"  Total estimated cost: ${cost.total_cost:.4f}"
    )


def get_video_duration_from_bytes(video_bytes: bytes) -> float | None:
    try:
        import tempfile
        import os
        from moviepy.editor import VideoFileClip

        # Write bytes to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
            tmp_file.write(video_bytes)
            tmp_path = tmp_file.name

        try:
            clip = VideoFileClip(tmp_path)
            duration = clip.duration
            clip.close()
            return duration
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        print(f"Error getting video duration: {e}")
        return None
