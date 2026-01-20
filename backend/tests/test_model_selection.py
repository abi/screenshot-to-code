import pytest
from unittest.mock import AsyncMock
from routes.generate_code import ModelSelectionStage
from llm import Llm


class TestModelSelectionAllKeys:
    """Test model selection when Gemini and Anthropic API keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_gemini_anthropic_create(self):
        """Gemini + Anthropic: Gemini 3 Flash, Claude 4.5 Sonnet, Claude 4.5 Opus, Gemini 3 Pro"""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [
            Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
            Llm.CLAUDE_4_5_SONNET_2025_09_29,
            Llm.CLAUDE_4_5_OPUS_2025_11_01,
            Llm.GEMINI_3_PRO_PREVIEW_HIGH,
        ]
        assert models == expected

    @pytest.mark.asyncio
    async def test_gemini_anthropic_update(self):
        """Gemini + Anthropic update: Same models regardless of generation_type"""
        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="image",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )

        expected = [
            Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
            Llm.CLAUDE_4_5_SONNET_2025_09_29,
            Llm.CLAUDE_4_5_OPUS_2025_11_01,
            Llm.GEMINI_3_PRO_PREVIEW_HIGH,
        ]
        assert models == expected


class TestModelSelectionOpenAIAnthropic:
    """Test model selection when only OpenAI and Anthropic keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_openai_anthropic(self):
        """OpenAI + Anthropic: Claude 4.5 Sonnet, GPT-4.1, cycling"""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key=None,
        )

        expected = [
            Llm.CLAUDE_4_5_SONNET_2025_09_29,
            Llm.GPT_4_1_2025_04_14,
            Llm.CLAUDE_4_5_SONNET_2025_09_29,
            Llm.GPT_4_1_2025_04_14,
        ]
        assert models == expected


class TestModelSelectionAnthropicOnly:
    """Test model selection when only Anthropic key is present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_anthropic_only(self):
        """Anthropic only: Claude 4.5 Sonnet, Claude 4.5 Opus, cycling"""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key=None,
            anthropic_api_key="key",
            gemini_api_key=None,
        )

        expected = [
            Llm.CLAUDE_4_5_SONNET_2025_09_29,
            Llm.CLAUDE_4_5_OPUS_2025_11_01,
            Llm.CLAUDE_4_5_SONNET_2025_09_29,
            Llm.CLAUDE_4_5_OPUS_2025_11_01,
        ]
        assert models == expected


class TestModelSelectionOpenAIOnly:
    """Test model selection when only OpenAI key is present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_openai_only(self):
        """OpenAI only: GPT-4.1, GPT-4o, cycling"""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key=None,
            gemini_api_key=None,
        )

        expected = [
            Llm.GPT_4_1_2025_04_14,
            Llm.GPT_4O_2024_11_20,
            Llm.GPT_4_1_2025_04_14,
            Llm.GPT_4O_2024_11_20,
        ]
        assert models == expected


class TestModelSelectionNoKeys:
    """Test model selection when no API keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_no_keys_raises_error(self):
        """No keys: Should raise an exception"""
        with pytest.raises(Exception, match="No OpenAI or Anthropic key"):
            await self.model_selector.select_models(
                generation_type="create",
                input_mode="text",
                openai_api_key=None,
                anthropic_api_key=None,
                gemini_api_key=None,
            )
