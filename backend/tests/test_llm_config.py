import pytest

from llm import (
    ANTHROPIC_MODELS,
    GEMINI_MODELS,
    MODEL_PROVIDER,
    OPENAI_MODEL_CONFIG,
    OPENAI_MODELS,
    Llm,
    get_openai_api_name,
    get_openai_reasoning_effort,
)


class TestModelProviderMapping:
    def test_every_llm_member_has_provider(self) -> None:
        for model in Llm:
            assert model in MODEL_PROVIDER, f"{model} missing from MODEL_PROVIDER"

    def test_convenience_sets_are_exhaustive(self) -> None:
        all_from_sets = OPENAI_MODELS | ANTHROPIC_MODELS | GEMINI_MODELS
        all_from_enum = set(Llm)
        assert all_from_sets == all_from_enum

    def test_sets_are_disjoint(self) -> None:
        assert OPENAI_MODELS.isdisjoint(ANTHROPIC_MODELS)
        assert OPENAI_MODELS.isdisjoint(GEMINI_MODELS)
        assert ANTHROPIC_MODELS.isdisjoint(GEMINI_MODELS)

    def test_openai_models_have_openai_provider(self) -> None:
        for model in OPENAI_MODELS:
            assert MODEL_PROVIDER[model] == "openai"

    def test_anthropic_models_have_anthropic_provider(self) -> None:
        for model in ANTHROPIC_MODELS:
            assert MODEL_PROVIDER[model] == "anthropic"

    def test_gemini_models_have_gemini_provider(self) -> None:
        for model in GEMINI_MODELS:
            assert MODEL_PROVIDER[model] == "gemini"


class TestOpenAIModelConfig:
    def test_all_openai_models_have_config(self) -> None:
        for model in OPENAI_MODELS:
            assert model in OPENAI_MODEL_CONFIG, f"{model} missing from OPENAI_MODEL_CONFIG"

    def test_all_configs_have_api_name(self) -> None:
        for model, config in OPENAI_MODEL_CONFIG.items():
            assert "api_name" in config, f"{model} config missing api_name"

    def test_get_openai_api_name(self) -> None:
        assert get_openai_api_name(Llm.GPT_4_1_2025_04_14) == "gpt-4.1-2025-04-14"
        assert get_openai_api_name(Llm.GPT_5_2_CODEX_HIGH) == "gpt-5.2-codex"

    def test_get_openai_reasoning_effort(self) -> None:
        assert get_openai_reasoning_effort(Llm.GPT_5_2_CODEX_LOW) == "low"
        assert get_openai_reasoning_effort(Llm.GPT_5_2_CODEX_MEDIUM) == "medium"
        assert get_openai_reasoning_effort(Llm.GPT_5_2_CODEX_HIGH) == "high"
        assert get_openai_reasoning_effort(Llm.GPT_5_2_CODEX_XHIGH) == "xhigh"

    def test_get_openai_reasoning_effort_no_reasoning(self) -> None:
        assert get_openai_reasoning_effort(Llm.GPT_4_1_2025_04_14) is None

    def test_get_openai_reasoning_effort_non_openai_model(self) -> None:
        assert get_openai_reasoning_effort(Llm.CLAUDE_OPUS_4_6) is None
