import os

NUM_VARIANTS = 4
NUM_VARIANTS_VIDEO = 2

# Gemini is the only active provider path.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", None)

# Legacy compatibility placeholders kept so older imports do not crash.
OPENAI_API_KEY = None
ANTHROPIC_API_KEY = None
OPENAI_BASE_URL = None
REPLICATE_API_KEY = None

IS_DEBUG_ENABLED = bool(os.environ.get("IS_DEBUG_ENABLED", False))
DEBUG_DIR = os.environ.get("DEBUG_DIR", "")
IS_PROD = os.environ.get("IS_PROD", False)
