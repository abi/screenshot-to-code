from agent.providers.anthropic.provider import (
    ADAPTIVE_THINKING_MODELS,
    _get_anthropic_api_model_name,
    _get_anthropic_effort,
)
from llm import Llm


def test_claude_opus_4_8_effort_variants_map_to_same_api_model() -> None:
    expected_efforts = {
        Llm.CLAUDE_OPUS_4_8_LOW: "low",
        Llm.CLAUDE_OPUS_4_8_MEDIUM: "medium",
        Llm.CLAUDE_OPUS_4_8_HIGH: "high",
        Llm.CLAUDE_OPUS_4_8_XHIGH: "xhigh",
        Llm.CLAUDE_OPUS_4_8_MAX: "max",
    }

    for model, effort in expected_efforts.items():
        assert _get_anthropic_api_model_name(model) == "claude-opus-4-8"
        assert _get_anthropic_effort(model) == effort


def test_claude_fable_5_effort_variants_map_to_same_api_model() -> None:
    expected_efforts = {
        Llm.CLAUDE_FABLE_5_LOW: "low",
        Llm.CLAUDE_FABLE_5_MEDIUM: "medium",
        Llm.CLAUDE_FABLE_5_HIGH: "high",
        Llm.CLAUDE_FABLE_5_XHIGH: "xhigh",
        Llm.CLAUDE_FABLE_5_MAX: "max",
    }

    for model, effort in expected_efforts.items():
        assert _get_anthropic_api_model_name(model) == "claude-fable-5"
        assert _get_anthropic_effort(model) == effort
        assert model.value in ADAPTIVE_THINKING_MODELS
