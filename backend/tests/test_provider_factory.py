import sys
from unittest.mock import MagicMock

import pytest

# Mock heavy provider SDKs before importing the factory module
sys.modules.setdefault("anthropic", MagicMock())
sys.modules.setdefault("google", MagicMock())
sys.modules.setdefault("google.genai", MagicMock())

from agent.providers.factory import create_provider_session
from llm import Llm


class TestCreateProviderSession:
    DUMMY_MESSAGES = [{"role": "system", "content": "hello"}]

    def test_openai_model_requires_key(self) -> None:
        with pytest.raises(Exception, match="OpenAI API key"):
            create_provider_session(
                model=Llm.GPT_5_2_CODEX_HIGH,
                prompt_messages=self.DUMMY_MESSAGES,
                should_generate_images=False,
                openai_api_key=None,
                openai_base_url=None,
                anthropic_api_key=None,
                gemini_api_key=None,
            )

    def test_anthropic_model_requires_key(self) -> None:
        with pytest.raises(Exception, match="Anthropic API key"):
            create_provider_session(
                model=Llm.CLAUDE_OPUS_4_6,
                prompt_messages=self.DUMMY_MESSAGES,
                should_generate_images=False,
                openai_api_key=None,
                openai_base_url=None,
                anthropic_api_key=None,
                gemini_api_key=None,
            )

    def test_gemini_model_requires_key(self) -> None:
        with pytest.raises(Exception, match="Gemini API key"):
            create_provider_session(
                model=Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
                prompt_messages=self.DUMMY_MESSAGES,
                should_generate_images=False,
                openai_api_key=None,
                openai_base_url=None,
                anthropic_api_key=None,
                gemini_api_key=None,
            )
