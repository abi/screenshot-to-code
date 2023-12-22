# Useful for debugging purposes when you don't want to waste GPT4-Vision credits
# Setting to True will stream a mock response instead of calling the OpenAI API
# TODO: Should only be set to true when value is 'True', not any abitrary truthy value
import os


SHOULD_MOCK_AI_RESPONSE = bool(os.environ.get("MOCK", False))
MODEL = os.environ.get("MODEL", 'gpt-4-vision')
IS_MODEL_GEMINI = MODEL == 'gemini'

# Set to True when running in production (on the hosted version)
# Used as a feature flag to enable or disable certain features
IS_PROD = os.environ.get("IS_PROD", False)
