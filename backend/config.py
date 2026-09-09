import os

NUM_VARIANTS = int(os.environ.get("NUM_VARIANTS", "2"))
NUM_VARIANTS_VIDEO = 2

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", None)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", None)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", None)
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", None)

# 9Router exposes combos as virtual OpenAI-compatible model IDs. The app sends
# this single combo name for every request; 9Router itself performs the
# configured fallback / round-robin / capability routing between its models.
# ROUTER_MODEL is kept as a backwards-compatible alias for existing Render
# deployments, but new deployments should use ROUTER_COMBO.
ROUTER_COMBO = os.environ.get("ROUTER_COMBO") or os.environ.get("ROUTER_MODEL")
ROUTER_MODEL = ROUTER_COMBO
ROUTER_ONLY = os.environ.get("ROUTER_ONLY", "false").strip().lower() in {"1", "true", "yes", "on"}

REPLICATE_API_KEY = os.environ.get("REPLICATE_API_KEY", None)
IS_DEBUG_ENABLED = os.environ.get("IS_DEBUG_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}
DEBUG_DIR = os.environ.get("DEBUG_DIR", "")
GENERATION_MAX_COST_USD = float(os.environ.get("GENERATION_MAX_COST_USD", "3.0"))
PROMPT_REPORTS_ENABLED = os.environ.get("PROMPT_REPORTS_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}
LOCAL_ASSET_DIR = os.environ.get("LOCAL_ASSET_DIR", os.path.join(os.path.dirname(__file__), "local_assets"))
LOCAL_ASSET_BASE_URL = os.environ.get("LOCAL_ASSET_BASE_URL", "http://127.0.0.1:7001")

# The upstream app intentionally blocks user-selected OpenAI base URLs in its
# hosted mode. Router deployments are server-controlled, so allow the server's
# configured OpenAI-compatible base URL while still hiding the setting in the UI.
IS_PROD = (
    os.environ.get("IS_PROD", "false").strip().lower() in {"1", "true", "yes", "on"}
    and not ROUTER_COMBO
)
DISABLE_SCREENSHOT_PREVIEW = os.environ.get("DISABLE_SCREENSHOT_PREVIEW", "false").strip().lower() in {"1", "true", "yes", "on"}
