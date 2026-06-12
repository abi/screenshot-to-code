import os

NUM_VARIANTS = 4
NUM_VARIANTS_VIDEO = 2

# LLM-related
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", None)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", None)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", None)
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", None)

# Image generation (optional)
REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY", None)

# Debugging-related
IS_DEBUG_ENABLED = bool(os.environ.get("IS_DEBUG_ENABLED", False))
DEBUG_DIR = os.environ.get("DEBUG_DIR", "")

# When enabled, every LLM request is written to run_logs/prompt_reports as a
# JSON report viewable at /evals/prompt-reports.
PROMPT_REPORTS_ENABLED = os.environ.get(
    "PROMPT_REPORTS_ENABLED", ""
).strip().lower() in {"1", "true", "yes", "on"}
LOCAL_ASSET_DIR = os.environ.get(
    "LOCAL_ASSET_DIR", os.path.join(os.path.dirname(__file__), "local_assets")
)

# Set to True when running in production (on the hosted version)
# Used as a feature flag to enable or disable certain features
IS_PROD = os.environ.get("IS_PROD", False)

# Hosted version only

PLATFORM_OPENAI_API_KEY = os.environ.get("PLATFORM_OPENAI_API_KEY", "")
PLATFORM_ANTHROPIC_API_KEY = os.environ.get("PLATFORM_ANTHROPIC_API_KEY", "")
PLATFORM_GEMINI_API_KEY = os.environ.get("PLATFORM_GEMINI_API_KEY", "")
PLATFORM_SCREENSHOTONE_API_KEY = os.environ.get("PLATFORM_SCREENSHOTONE_API_KEY", "")

BACKEND_SAAS_URL = os.environ.get("BACKEND_SAAS_URL", "")
BACKEND_SAAS_API_SECRET = os.environ.get("BACKEND_SAAS_API_SECRET", "")
