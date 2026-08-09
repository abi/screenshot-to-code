import os

NUM_VARIANTS = 4
NUM_VARIANTS_VIDEO = 2

# LLM-related
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", None)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", None)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", None)
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", None)
# Custom base URLs, e.g. to route through a LiteLLM proxy using a Virtual Key
# as the provider API key.
ANTHROPIC_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL", None)
GEMINI_BASE_URL = os.environ.get("GEMINI_BASE_URL", None)

# Image generation (optional)
REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY", None)

# Debugging-related
IS_DEBUG_ENABLED = bool(os.environ.get("IS_DEBUG_ENABLED", False))
DEBUG_DIR = os.environ.get("DEBUG_DIR", "")

# When enabled, every LLM request is written to run_logs/prompt_reports as a
# JSON report viewable at /evals/prompt-reports.
# Hard per-generation spend ceiling; a run that would continue past this is
# aborted. Applies per variant/eval run. Unpriced models are not bounded.
GENERATION_MAX_COST_USD = 3.0

PROMPT_REPORTS_ENABLED = os.environ.get(
    "PROMPT_REPORTS_ENABLED", ""
).strip().lower() in {"1", "true", "yes", "on"}
LOCAL_ASSET_DIR = os.environ.get(
    "LOCAL_ASSET_DIR", os.path.join(os.path.dirname(__file__), "local_assets")
)
# Base URL the backend serves /local-assets from. The live (websocket) path
# infers this per-request; the evals path has no request, so it uses this.
LOCAL_ASSET_BASE_URL = os.environ.get("LOCAL_ASSET_BASE_URL", "http://127.0.0.1:7001")

# Set to True when running in production (on the hosted version)
# Used as a feature flag to enable or disable certain features
IS_PROD = os.environ.get("IS_PROD", False)
