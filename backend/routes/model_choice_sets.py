from llm import Llm

# Video variants always use Gemini.
VIDEO_VARIANT_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
)

# OrcaRouter gateway variants. `orcarouter/auto` routes each request to the
# best available model automatically.
ORCAROUTER_VARIANT_MODELS = (
    Llm.ORCAROUTER_AUTO,
)

# All API keys available.

# Image (Create)

# Refreshed 2026-07-27 from judged evals on the jun-21 set (see the
# "Jul 24 session" matrix): sol max is the quality anchor (8.2/10 avg),
# opus 5 medium the best non-anchor (7.8), 3.1 pro the third take (7.2),
# and 3-flash high the fast slot (zero failures across the set).
ALL_KEYS_MODELS_DEFAULT = (
    Llm.CLAUDE_OPUS_5_MEDIUM,
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
    Llm.GPT_5_6_SOL_MAX,
)

# Text (Create)

# Refreshed 2026-07-27 from the "Text evals v1" session (8 briefs x 7
# models): sol high and opus 5 high replace gpt-5.5 high and opus 4.8 high
# at similar cost/latency; 3-flash minimal keeps the fast slot (48s median,
# $0.05/brief) and 3.1-pro low stays for now.
ALL_KEYS_MODELS_TEXT_CREATE = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GPT_5_6_SOL_HIGH,
    Llm.CLAUDE_OPUS_5_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
)

# Image + Text (Update)

ALL_KEYS_MODELS_UPDATE = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GPT_5_6_TERRA_LOW,
)

# Key subset fallbacks.
GEMINI_ANTHROPIC_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    Llm.CLAUDE_OPUS_4_8_MEDIUM,
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
)
GEMINI_OPENAI_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    Llm.GPT_5_5_HIGH,
    Llm.GPT_5_5_LOW,
)
OPENAI_ANTHROPIC_MODELS = (
    Llm.CLAUDE_OPUS_4_8_MEDIUM,
    Llm.GPT_5_5_HIGH,
    Llm.GPT_5_5_LOW,
)
GEMINI_ONLY_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
)
ANTHROPIC_ONLY_MODELS = (
    Llm.CLAUDE_OPUS_4_8_MEDIUM,
    Llm.CLAUDE_SONNET_4_6,
)
OPENAI_ONLY_MODELS = (
    Llm.GPT_5_5_HIGH,
    Llm.GPT_5_5_LOW,
)
