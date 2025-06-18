import pytest
from unittest.mock import AsyncMock
from routes.generate_code import ModelSelectionStage
from llm import Llm


class TestModelSelectionAllKeys:
    """Test model selection when all API keys are present."""

    def setup_method(self):
        """Set up test fixtures."""
        mock_throw_error = AsyncMock()
        self.model_selector = ModelSelectionStage(mock_throw_error)

    @pytest.mark.asyncio
    async def test_text_create(self):
        """Text + Create: GPT-4.1, Claude 3.7, Claude 4, GPT-4.1"""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )
        
        expected = [
            Llm.GPT_4_1_2025_04_14,
            Llm.CLAUDE_3_7_SONNET_2025_02_19,
            Llm.CLAUDE_4_SONNET_2025_05_14,
            Llm.GPT_4_1_2025_04_14,  # NUM_VARIANTS=4, cycles back
        ]
        assert models == expected

    @pytest.mark.asyncio
    async def test_text_update(self):
        """Text + Update: GPT-4.1, Claude 3.7, Claude 4, GPT-4.1"""
        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="text",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )
        
        expected = [
            Llm.GPT_4_1_2025_04_14,
            Llm.CLAUDE_3_7_SONNET_2025_02_19,
            Llm.CLAUDE_4_SONNET_2025_05_14,
            Llm.GPT_4_1_2025_04_14,  # NUM_VARIANTS=4, cycles back
        ]
        assert models == expected

    @pytest.mark.asyncio
    async def test_image_create(self):
        """Image + Create: GPT-4.1, Claude 3.7, Gemini 2.0, GPT-4.1"""
        models = await self.model_selector.select_models(
            generation_type="create",
            input_mode="image",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )
        
        expected = [
            Llm.GPT_4_1_2025_04_14,
            Llm.CLAUDE_3_7_SONNET_2025_02_19,
            Llm.GEMINI_2_0_FLASH,
            Llm.GPT_4_1_2025_04_14,  # NUM_VARIANTS=4, cycles back
        ]
        assert models == expected

    @pytest.mark.asyncio
    async def test_image_update(self):
        """Image + Update: GPT-4.1, Claude 3.7, Claude 3.7, GPT-4.1 (no Gemini)"""
        models = await self.model_selector.select_models(
            generation_type="update",
            input_mode="image",
            openai_api_key="key",
            anthropic_api_key="key",
            gemini_api_key="key",
        )
        
        expected = [
            Llm.GPT_4_1_2025_04_14,
            Llm.CLAUDE_3_7_SONNET_2025_02_19,
            Llm.CLAUDE_3_7_SONNET_2025_02_19,  # Gemini doesn't support update, falls back to Claude
            Llm.GPT_4_1_2025_04_14,  # NUM_VARIANTS=4, cycles back
        ]
        assert models == expected
