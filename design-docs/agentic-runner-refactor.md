# Agentic Runner Refactor Spec

## Goals
- Reduce duplicated streaming logic across OpenAI/Anthropic/Gemini runners.
- Centralize tool schemas and telemetry formatting.
- Make the agentic pipeline easier to test, extend, and reason about.

## Decision: Unified Stream Loop + Provider Adapters
- Introduce a provider-agnostic stream loop that consumes normalized events
  (assistant_delta, thinking_delta, tool_call_delta, tool_call_complete, done).
- Add per-provider adapters that translate native streams into normalized events.
- Centralize tool execution, `toolStart`/`toolResult` emission, and `setCode` preview
  streaming inside the unified loop.
- Keep per-provider adapters small and focused on parsing provider-specific payloads.

## Decision: Canonical Tool Definitions + Serializer Layer
- Define tool schemas once in a canonical representation.
- Add serializer helpers to produce OpenAI Responses, Anthropic, and Gemini tool
  schemas from the canonical form.
- Centralize tool input/output summaries to keep UI telemetry consistent across
  providers and reduce duplication.

## Planned Removals

### Image Cache
- Remove prompt-to-URL image caching in the agentic tool layer.
- Rationale: simplify state, reduce hidden cross-variant coupling.
- Follow-up: ensure image generation remains deterministic per request when needed
  (e.g., pass explicit seeds or expose caching at a higher layer if required).

### OpenAI ChatCompletion Path
- Remove the legacy ChatCompletion streaming path.
- Route all OpenAI models through the Responses API implementation.
- Update model lists and runtime checks to eliminate the ChatCompletion branch.

### Non-Agentic Generation Paths (e.g., Video)
Keep video generation, but route it through the agentic runner:
- Replace video-specific streaming helpers with agentic runner support for video inputs.
- Remove conditional branches that bypass the agentic path for video create/update.
- Preserve video-specific prompt and media handling, but integrate it into the
  agentic tool/stream pipeline.
- Update tests and docs to reflect a single agentic generation path that
  supports video inputs.

## File/Module Split
- `agentic/runner.py`: orchestration + shared stream loop.
- `agentic/streaming/`: provider adapters (openai, responses, anthropic, gemini).
- `agentic/tools.py`: tool definitions, serialization, and execution.
- `agentic/state.py`: file state + seeding utilities.

## Non-Goals
- No functional UX changes beyond the removal items above.
- No redesign of the frontend agent activity UI; it should continue to consume
  the same tool/assistant/thinking events.
