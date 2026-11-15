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

# -------------------------------------------------------------------------- #
# Agent / tool-runtime settings
# -------------------------------------------------------------------------- #

# Opt-in switch for structured-output / forced-tool-call behaviour.
# When True the factory switches to AGENT_STRUCTURED_OUTPUT_MODE and
# AGENT_TOOL_CALL_POLICY below, overriding the provider defaults.
# Backward-compatible: defaults to False so existing deployments are unaffected.
AGENT_STRUCTURED_OUTPUT = (
    os.environ.get("AGENT_STRUCTURED_OUTPUT", "").strip().lower() in {"1", "true", "yes", "on"}
)

# Which StructuredOutputMode to use when AGENT_STRUCTURED_OUTPUT is True.
# Options: "free" | "prefer_json" | "force_tool"
# Default: "force_tool" — the safest setting for unreliable JSON-emitting models.
_AGENT_STRUCTURED_OUTPUT_MODE = os.environ.get(
    "AGENT_STRUCTURED_OUTPUT_MODE", "force_tool"
).strip().lower()
if _AGENT_STRUCTURED_OUTPUT_MODE not in {"free", "prefer_json", "force_tool"}:
    _AGENT_STRUCTURED_OUTPUT_MODE = "force_tool"
AGENT_STRUCTURED_OUTPUT_MODE: str = _AGENT_STRUCTURED_OUTPUT_MODE  # consumed by factory

# Tool-call policy applied on every step of the agent loop.
# Options: "free" | "warn" | "required"
# "required" causes UnexpectedTextStepError (AgentStepError subclass) when the
# model emits plain text instead of a tool call on a step.
_AGENT_TOOL_CALL_POLICY = os.environ.get("AGENT_TOOL_CALL_POLICY", "free").strip().lower()
if _AGENT_TOOL_CALL_POLICY not in {"free", "warn", "required"}:
    _AGENT_TOOL_CALL_POLICY = "free"
AGENT_TOOL_CALL_POLICY: str = _AGENT_TOOL_CALL_POLICY  # consumed by factory

# Optional per-step spend ceiling in USD.
# If set, any step that would bring cumulative spend above this threshold is
# aborted with BudgetExceededError (sent to the frontend as budgetExceeded).
# Default: None (no per-step cap; only the global GENERATION_MAX_COST_USD applies).
_AGENT_STEP_SPEND_BUDGET_USD = os.environ.get("AGENT_STEP_SPEND_BUDGET_USD", "").strip()
AGENT_STEP_SPEND_BUDGET_USD: float | None = (
    float(_AGENT_STEP_SPEND_BUDGET_USD) if _AGENT_STEP_SPEND_BUDGET_USD else None
)

# -------------------------------------------------------------------------- #
# Screenshot-preview cache
# -------------------------------------------------------------------------- #

# When True, screenshot_preview tool results are cached by HTML content hash.
# Cache hits skip the Playwright render entirely, saving ~1-2 s per cache hit.
# Backward-compatible: defaults to True so existing deployments get the speed-up.
SCREENSHOT_CACHE_ENABLED = (
    os.environ.get("SCREENSHOT_CACHE_ENABLED", "1").strip().lower() in {"1", "true", "yes", "on"}
)

# Directory where cached screenshots are stored.
# Default: ~/.cache/screenshot_preview (resolved relative to this file's parent).
_SCREENSHOT_CACHE_DIR_DEFAULT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", ".screenshot_cache"
)
SCREENSHOT_CACHE_DIR = os.path.abspath(
    os.environ.get("SCREENSHOT_CACHE_DIR", _SCREENSHOT_CACHE_DIR_DEFAULT)
)

# -------------------------------------------------------------------------- #
# End screenshot-preview cache
# -------------------------------------------------------------------------- #

# -------------------------------------------------------------------------- #
# End agent settings
# -------------------------------------------------------------------------- #
