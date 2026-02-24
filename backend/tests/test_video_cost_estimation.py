import pytest

from llm import Llm
from video.cost_estimation import (
    CostEstimate,
    MediaResolution,
    calculate_cost,
    estimate_output_tokens,
    estimate_video_generation_cost,
    estimate_video_input_tokens,
    format_cost_estimate,
    format_detailed_input_estimate,
    get_model_api_name,
    PROMPT_TOKENS_ESTIMATE,
    VIDEO_TOKENS_PER_FRAME,
)


class TestGetModelApiName:
    def test_flash_preview_high(self) -> None:
        assert get_model_api_name(Llm.GEMINI_3_FLASH_PREVIEW_HIGH) == "gemini-3-flash-preview"

    def test_flash_preview_minimal(self) -> None:
        assert get_model_api_name(Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL) == "gemini-3-flash-preview"

    def test_3_1_pro_preview_variants(self) -> None:
        assert get_model_api_name(Llm.GEMINI_3_1_PRO_PREVIEW_HIGH) == "gemini-3.1-pro-preview"
        assert get_model_api_name(Llm.GEMINI_3_1_PRO_PREVIEW_MEDIUM) == "gemini-3.1-pro-preview"
        assert get_model_api_name(Llm.GEMINI_3_1_PRO_PREVIEW_LOW) == "gemini-3.1-pro-preview"

    def test_pro_preview_variants(self) -> None:
        assert get_model_api_name(Llm.GEMINI_3_PRO_PREVIEW_HIGH) == "gemini-3-pro-preview"
        assert get_model_api_name(Llm.GEMINI_3_PRO_PREVIEW_LOW) == "gemini-3-pro-preview"

    def test_non_gemini_returns_value(self) -> None:
        assert get_model_api_name(Llm.CLAUDE_OPUS_4_6) == "claude-opus-4-6"


class TestEstimateVideoInputTokens:
    def test_basic_calculation(self) -> None:
        result = estimate_video_input_tokens(
            video_duration_seconds=10.0,
            fps=1.0,
            media_resolution=MediaResolution.HIGH,
        )
        expected = int(10.0 * 1.0 * VIDEO_TOKENS_PER_FRAME[MediaResolution.HIGH]) + PROMPT_TOKENS_ESTIMATE
        assert result == expected

    def test_low_resolution(self) -> None:
        result = estimate_video_input_tokens(
            video_duration_seconds=5.0,
            fps=1.0,
            media_resolution=MediaResolution.LOW,
        )
        expected = int(5.0 * 1.0 * VIDEO_TOKENS_PER_FRAME[MediaResolution.LOW]) + PROMPT_TOKENS_ESTIMATE
        assert result == expected

    def test_higher_fps(self) -> None:
        result = estimate_video_input_tokens(
            video_duration_seconds=10.0,
            fps=2.0,
            media_resolution=MediaResolution.HIGH,
        )
        expected = int(10.0 * 2.0 * VIDEO_TOKENS_PER_FRAME[MediaResolution.HIGH]) + PROMPT_TOKENS_ESTIMATE
        assert result == expected

    def test_zero_duration(self) -> None:
        result = estimate_video_input_tokens(video_duration_seconds=0.0)
        assert result == PROMPT_TOKENS_ESTIMATE

    def test_default_parameters(self) -> None:
        result = estimate_video_input_tokens(video_duration_seconds=30.0)
        expected = int(30.0 * 1.0 * VIDEO_TOKENS_PER_FRAME[MediaResolution.HIGH]) + PROMPT_TOKENS_ESTIMATE
        assert result == expected


class TestEstimateOutputTokens:
    def test_high_thinking(self) -> None:
        result = estimate_output_tokens(max_output_tokens=50000, thinking_level="high")
        assert result == int(50000 * 0.6)

    def test_low_thinking(self) -> None:
        result = estimate_output_tokens(max_output_tokens=50000, thinking_level="low")
        assert result == int(50000 * 0.6)

    def test_minimal_thinking(self) -> None:
        result = estimate_output_tokens(max_output_tokens=50000, thinking_level="minimal")
        assert result == int(50000 * 0.6)

    def test_unknown_thinking_uses_default(self) -> None:
        result = estimate_output_tokens(max_output_tokens=50000, thinking_level="unknown")
        assert result == int(50000 * 0.6)

    def test_custom_max_output(self) -> None:
        result = estimate_output_tokens(max_output_tokens=100000, thinking_level="high")
        assert result == int(100000 * 0.6)


class TestCalculateCost:
    def test_flash_model_pricing(self) -> None:
        cost = calculate_cost(
            input_tokens=1_000_000,
            output_tokens=1_000_000,
            model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
        )
        assert cost.input_cost == pytest.approx(0.50)
        assert cost.output_cost == pytest.approx(3.00)
        assert cost.total_cost == pytest.approx(3.50)
        assert cost.input_tokens == 1_000_000
        assert cost.output_tokens == 1_000_000

    def test_pro_model_pricing(self) -> None:
        cost = calculate_cost(
            input_tokens=1_000_000,
            output_tokens=1_000_000,
            model=Llm.GEMINI_3_PRO_PREVIEW_HIGH,
        )
        assert cost.input_cost == pytest.approx(2.00)
        assert cost.output_cost == pytest.approx(12.00)
        assert cost.total_cost == pytest.approx(14.00)

    def test_zero_tokens(self) -> None:
        cost = calculate_cost(
            input_tokens=0,
            output_tokens=0,
            model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
        )
        assert cost.total_cost == 0.0

    def test_unknown_model_uses_flash_pricing(self) -> None:
        cost = calculate_cost(
            input_tokens=1_000_000,
            output_tokens=0,
            model=Llm.CLAUDE_OPUS_4_6,
        )
        assert cost.input_cost == pytest.approx(0.50)


class TestEstimateVideoGenerationCost:
    def test_end_to_end_estimate(self) -> None:
        cost = estimate_video_generation_cost(
            video_duration_seconds=10.0,
            model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
            fps=1.0,
            media_resolution=MediaResolution.HIGH,
            max_output_tokens=50000,
            thinking_level="high",
        )
        assert isinstance(cost, CostEstimate)
        assert cost.input_tokens > 0
        assert cost.output_tokens > 0
        assert cost.total_cost > 0


class TestFormatCostEstimate:
    def test_formatting(self) -> None:
        cost = CostEstimate(
            input_cost=0.005,
            output_cost=0.03,
            total_cost=0.035,
            input_tokens=10000,
            output_tokens=10000,
        )
        text = format_cost_estimate(cost)
        assert "10,000" in text
        assert "$0.0050" in text
        assert "$0.0300" in text
        assert "$0.0350" in text


class TestFormatDetailedInputEstimate:
    def test_contains_breakdown(self) -> None:
        text = format_detailed_input_estimate(
            video_duration_seconds=10.0,
            fps=1.0,
            media_resolution=MediaResolution.HIGH,
            model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
        )
        assert "Frames:" in text
        assert "10.0 frames" in text
        assert "Prompt overhead:" in text
        assert "Total input:" in text
