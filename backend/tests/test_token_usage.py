"""Tests for unified token usage tracking and cost computation."""

from types import SimpleNamespace

from agent.providers.pricing import MODEL_PRICING, ModelPricing
from agent.providers.token_usage import TokenUsage
from agent.providers.anthropic import _extract_anthropic_usage
from agent.providers.gemini import _extract_usage as _extract_gemini_usage
from agent.providers.openai import _extract_openai_usage


# ---------------------------------------------------------------------------
# TokenUsage.accumulate
# ---------------------------------------------------------------------------


class TestAccumulate:
    def test_sums_all_fields(self) -> None:
        a = TokenUsage(input=100, output=50, cache_read=20, cache_write=10, total=180)
        b = TokenUsage(input=200, output=80, cache_read=30, cache_write=5, total=315)
        a.accumulate(b)
        assert a == TokenUsage(
            input=300, output=130, cache_read=50, cache_write=15, total=495
        )

    def test_accumulate_zero_is_noop(self) -> None:
        a = TokenUsage(input=100, output=50, cache_read=20, total=170)
        a.accumulate(TokenUsage())
        assert a == TokenUsage(input=100, output=50, cache_read=20, total=170)

    def test_multiple_accumulations(self) -> None:
        total = TokenUsage()
        for i in range(1, 4):
            total.accumulate(TokenUsage(input=i * 10, output=i * 5, total=i * 15))
        # input: 10+20+30=60, output: 5+10+15=30, total: 15+30+45=90
        assert total.input == 60
        assert total.output == 30
        assert total.total == 90


# ---------------------------------------------------------------------------
# TokenUsage.cost
# ---------------------------------------------------------------------------


class TestCost:
    def test_basic_cost(self) -> None:
        usage = TokenUsage(input=1_000_000, output=1_000_000, total=2_000_000)
        pricing = ModelPricing(input=2.00, output=8.00)
        # 1M * $2 + 1M * $8 = $10
        assert usage.cost(pricing) == 10.0

    def test_zero_tokens_zero_cost(self) -> None:
        usage = TokenUsage()
        pricing = ModelPricing(input=5.00, output=25.00, cache_read=0.50)
        assert usage.cost(pricing) == 0.0

    def test_cache_heavy_scenario(self) -> None:
        # 100k non-cached input, 900k cached, 500k output
        usage = TokenUsage(
            input=100_000, output=500_000, cache_read=900_000, total=1_500_000
        )
        pricing = ModelPricing(input=2.00, output=8.00, cache_read=0.50)
        # 100k * $2/M + 500k * $8/M + 900k * $0.50/M
        # = $0.20 + $4.00 + $0.45 = $4.65
        expected = (100_000 * 2.00 + 500_000 * 8.00 + 900_000 * 0.50) / 1_000_000
        assert abs(usage.cost(pricing) - expected) < 1e-9

    def test_anthropic_with_cache_write(self) -> None:
        usage = TokenUsage(
            input=500_000,
            output=200_000,
            cache_read=300_000,
            cache_write=100_000,
            total=1_100_000,
        )
        pricing = ModelPricing(
            input=3.00, output=15.00, cache_read=0.30, cache_write=3.75
        )
        expected = (
            500_000 * 3.00
            + 200_000 * 15.00
            + 300_000 * 0.30
            + 100_000 * 3.75
        ) / 1_000_000
        assert abs(usage.cost(pricing) - expected) < 1e-9


class TestCacheHitRate:
    def test_zero_total_input_is_zero_percent(self) -> None:
        usage = TokenUsage()
        assert usage.total_input_tokens() == 0
        assert usage.cache_hit_rate_percent() == 0.0

    def test_cache_hit_rate_without_cache_write(self) -> None:
        usage = TokenUsage(input=300, cache_read=100)
        assert usage.total_input_tokens() == 400
        assert abs(usage.cache_hit_rate_percent() - 25.0) < 1e-9

    def test_cache_hit_rate_includes_cache_write_in_denominator(self) -> None:
        usage = TokenUsage(input=300, cache_read=100, cache_write=100)
        assert usage.total_input_tokens() == 500
        assert abs(usage.cache_hit_rate_percent() - 20.0) < 1e-9


# ---------------------------------------------------------------------------
# Gemini: _extract_usage
# ---------------------------------------------------------------------------


def _gemini_chunk(
    prompt: int = 0,
    candidates: int = 0,
    thoughts: int = 0,
    cached: int = 0,
    total: int = 0,
) -> SimpleNamespace:
    """Build a fake Gemini GenerateContentResponse with usage_metadata."""
    return SimpleNamespace(
        usage_metadata=SimpleNamespace(
            prompt_token_count=prompt,
            candidates_token_count=candidates,
            thoughts_token_count=thoughts,
            cached_content_token_count=cached,
            total_token_count=total,
        )
    )


class TestGeminiExtract:
    def test_normal_response(self) -> None:
        chunk = _gemini_chunk(
            prompt=1000, candidates=400, thoughts=100, cached=200, total=1500
        )
        usage = _extract_gemini_usage(chunk)  # type: ignore[arg-type]
        assert usage is not None
        assert usage.input == 800  # 1000 - 200
        assert usage.output == 500  # 400 + 100
        assert usage.cache_read == 200
        assert usage.cache_write == 0
        assert usage.total == 1500

    def test_no_cache(self) -> None:
        chunk = _gemini_chunk(prompt=500, candidates=200, thoughts=50, total=750)
        usage = _extract_gemini_usage(chunk)  # type: ignore[arg-type]
        assert usage is not None
        assert usage.input == 500
        assert usage.cache_read == 0

    def test_no_usage_metadata_returns_none(self) -> None:
        chunk = SimpleNamespace(usage_metadata=None)
        assert _extract_gemini_usage(chunk) is None  # type: ignore[arg-type]

    def test_none_subfields_default_to_zero(self) -> None:
        chunk = SimpleNamespace(
            usage_metadata=SimpleNamespace(
                prompt_token_count=None,
                candidates_token_count=None,
                thoughts_token_count=None,
                cached_content_token_count=None,
                total_token_count=None,
            )
        )
        usage = _extract_gemini_usage(chunk)  # type: ignore[arg-type]
        assert usage == TokenUsage()


# ---------------------------------------------------------------------------
# OpenAI: _extract_openai_usage
# ---------------------------------------------------------------------------


def _openai_response(
    input_tokens: int = 0,
    output_tokens: int = 0,
    total_tokens: int = 0,
    cached_tokens: int = 0,
) -> SimpleNamespace:
    """Build a fake OpenAI response.completed event payload."""
    return SimpleNamespace(
        usage=SimpleNamespace(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            input_tokens_details=SimpleNamespace(cached_tokens=cached_tokens),
        )
    )


class TestOpenAIExtract:
    def test_normal_response(self) -> None:
        resp = _openai_response(
            input_tokens=1000, output_tokens=500, total_tokens=1500, cached_tokens=300
        )
        usage = _extract_openai_usage(resp)
        assert usage.input == 700  # 1000 - 300
        assert usage.output == 500
        assert usage.cache_read == 300
        assert usage.cache_write == 0
        assert usage.total == 1500

    def test_no_cache(self) -> None:
        resp = _openai_response(
            input_tokens=800, output_tokens=200, total_tokens=1000
        )
        usage = _extract_openai_usage(resp)
        assert usage.input == 800
        assert usage.cache_read == 0

    def test_no_usage_returns_empty(self) -> None:
        resp = SimpleNamespace()  # no .usage attribute
        usage = _extract_openai_usage(resp)
        assert usage == TokenUsage()

    def test_no_input_tokens_details(self) -> None:
        resp = SimpleNamespace(
            usage=SimpleNamespace(
                input_tokens=500,
                output_tokens=200,
                total_tokens=700,
            )
        )
        usage = _extract_openai_usage(resp)
        assert usage.input == 500
        assert usage.cache_read == 0


# ---------------------------------------------------------------------------
# Anthropic: _extract_anthropic_usage
# ---------------------------------------------------------------------------


def _anthropic_message(
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read: int = 0,
    cache_write: int = 0,
) -> SimpleNamespace:
    """Build a fake Anthropic final message with usage."""
    return SimpleNamespace(
        usage=SimpleNamespace(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_read_input_tokens=cache_read,
            cache_creation_input_tokens=cache_write,
        )
    )


class TestAnthropicExtract:
    def test_normal_response(self) -> None:
        msg = _anthropic_message(
            input_tokens=1000, output_tokens=500, cache_read=200, cache_write=50
        )
        usage = _extract_anthropic_usage(msg)
        assert usage.input == 1000
        assert usage.output == 500
        assert usage.cache_read == 200
        assert usage.cache_write == 50
        assert usage.total == 1750  # sum of all fields

    def test_no_cache(self) -> None:
        msg = _anthropic_message(input_tokens=600, output_tokens=300)
        usage = _extract_anthropic_usage(msg)
        assert usage.input == 600
        assert usage.cache_read == 0
        assert usage.cache_write == 0
        assert usage.total == 900

    def test_no_usage_returns_empty(self) -> None:
        msg = SimpleNamespace()  # no .usage attribute
        usage = _extract_anthropic_usage(msg)
        assert usage == TokenUsage()


# ---------------------------------------------------------------------------
# MODEL_PRICING lookup
# ---------------------------------------------------------------------------


class TestModelPricing:
    def test_known_models_have_pricing(self) -> None:
        for name in [
            "gpt-4.1-2025-04-14",
            "gpt-5.2-codex",
            "claude-opus-4-6",
            "claude-sonnet-4-6",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gpt-5.4-2026-03-05",
        ]:
            assert name in MODEL_PRICING, f"missing pricing for {name}"

    def test_unknown_model_returns_none(self) -> None:
        assert MODEL_PRICING.get("nonexistent-model") is None

    def test_anthropic_has_cache_write_rate(self) -> None:
        for name in ["claude-opus-4-6", "claude-sonnet-4-6"]:
            assert MODEL_PRICING[name].cache_write > 0

    def test_openai_gemini_no_cache_write(self) -> None:
        for name in ["gpt-4.1-2025-04-14", "gemini-3-flash-preview"]:
            assert MODEL_PRICING[name].cache_write == 0.0
