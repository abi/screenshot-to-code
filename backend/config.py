# Useful for debugging purposes when you don't want to waste GPT4-Vision credits
# Setting to True will stream a mock response instead of calling the OpenAI API
# TODO: Should only be set to true when value is 'True', not any abitrary truthy value
import os
from enum import Enum

class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    XAI = "xai"
    GEMINI = "gemini"

NUM_VARIANTS = 2

# Provider configuration
PROVIDER = os.environ.get("PROVIDER", Provider.OPENAI)

# LLM-related
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", None)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", None)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", None)
XAI_API_KEY = os.environ.get("XAI_API_KEY", None)

# Base URLs for different providers
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com")
ANTHROPIC_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
XAI_BASE_URL = os.environ.get("XAI_BASE_URL", "https://api.x.ai")
GEMINI_BASE_URL = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com")

# Get base URL based on provider
def get_base_url():
    if PROVIDER == Provider.OPENAI:
        return OPENAI_BASE_URL
    elif PROVIDER == Provider.ANTHROPIC:
        return ANTHROPIC_BASE_URL
    elif PROVIDER == Provider.XAI:
        return XAI_BASE_URL
    elif PROVIDER == Provider.GEMINI:
        return GEMINI_BASE_URL
    return None

# Image generation (optional)
REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY", None)

# Debugging-related

SHOULD_MOCK_AI_RESPONSE = bool(os.environ.get("MOCK", False))
IS_DEBUG_ENABLED = bool(os.environ.get("IS_DEBUG_ENABLED", False))
DEBUG_DIR = os.environ.get("DEBUG_DIR", "")

# Set to True when running in production (on the hosted version)
# Used as a feature flag to enable or disable certain features
IS_PROD = os.environ.get("IS_PROD", False)
