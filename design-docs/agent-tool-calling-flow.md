# Agent Tool-Calling Flow (Backend)

This document explains exactly what happens after prompt messages are built and a variant starts running in the agent.

## Entry Point

Per variant, `Agent(...).run(model, prompt_messages)` is called from:

- `backend/routes/generate_code.py` (`AgenticGenerationStage._run_variant`)

`Agent` is a thin wrapper over `AgentEngine`:

- `backend/agent/runner.py`
- `backend/agent/engine.py`

## Core Tool-Calling Loop

The main loop lives in:

- `backend/agent/engine.py` -> `AgentEngine._run_with_session(...)`

Loop behavior:

1. Start turn-local streaming state.
- Create event IDs for assistant/thinking streams.
- Initialize:
  - `started_tool_ids`
  - `streamed_lengths`

2. Stream one provider turn.
- Call `turn = await session.stream_turn(on_event)`
- `on_event` handles streamed deltas:
  - `assistant_delta` -> websocket `assistant`
  - `thinking_delta` -> websocket `thinking`
  - `tool_call_delta` -> `_handle_streamed_tool_delta(...)`

3. Branch by tool calls.
- If `turn.tool_calls` is empty: finalize and return.
- Otherwise execute each tool call, emit tool lifecycle messages, and collect results.

4. Continue conversation with tool results.
- Call `session.append_tool_results(turn, executed_tool_calls)`
- Next loop iteration sends another model turn with updated history.

5. Guardrail.
- Maximum 20 tool turns; raises if exceeded.

## Tool Execution

Tool runtime:

- `backend/agent/tools/runtime.py` -> `AgentToolRuntime.execute(...)`

Tool definitions:

- `backend/agent/tools/definitions.py` -> `canonical_tool_definitions(...)`

Supported tools:

- `create_file`
- `edit_file`
- `generate_images`
- `remove_background`
- `retrieve_option`

Execution lifecycle per tool call:

1. Emit `toolStart` (unless already emitted from streamed args).
2. If `create_file`, stream preview code chunks while args are still arriving.
3. Execute tool in runtime.
4. If tool returns `updated_content`, emit `setCode`.
5. Emit `toolResult` with `{ name, output, ok }`.

### Live streamed `create_file` preview

The engine parses partial tool arguments from provider deltas using:

- `backend/agent/tools/parsing.py`:
  - `extract_content_from_args(...)`
  - `extract_path_from_args(...)`

Then `_handle_streamed_tool_delta(...)` in `engine.py`:

- Emits early `toolStart` for `create_file`
- Emits incremental `setCode` updates as `content` grows

This allows frontend preview before actual tool execution completes.

## Provider-Specific Continuation

Provider contract:

- `backend/agent/providers/base.py`
  - `ProviderSession`
  - `ProviderTurn`

Each provider returns a `ProviderTurn` with:

- `assistant_text`
- `tool_calls`
- `assistant_turn` (provider-native turn object needed for continuation)

After tool execution, each provider appends tool results differently.

### OpenAI continuation

- `backend/agent/providers/openai.py` -> `OpenAIProviderSession.append_tool_results(...)`

Behavior:

1. Append prior assistant output items (`turn.assistant_turn`) to request history.
2. Append one `function_call_output` per tool result:
- `{"type":"function_call_output","call_id":...,"output": json_string}`

Next `responses.create(...)` turn uses this updated item list.

### Anthropic continuation

- `backend/agent/providers/anthropic.py` -> `AnthropicProviderSession.append_tool_results(...)`

Behavior:

1. Append assistant message blocks:
- optional text block
- tool_use blocks (`id`, `name`, `input`)
2. Append user message with tool_result blocks:
- `tool_use_id`, serialized result content, `is_error`

Next `messages.stream(...)` turn continues from these blocks.

### Gemini continuation

- `backend/agent/providers/gemini.py` -> `GeminiProviderSession.append_tool_results(...)`

Behavior:

1. Append exact original model content (`turn.assistant_turn`).
2. Append `role="tool"` content with `Part.from_function_response(...)` per tool.

This preserves the model part structure required for reliable continuation (including thought-signature-sensitive flows).

## Response Streaming to Frontend

Frontend websocket message types emitted during generation:

- `assistant`
- `thinking`
- `toolStart`
- `toolResult`
- `setCode`

Where they come from:

1. Provider parser emits `StreamEvent` deltas during `stream_turn(...)`.
2. Engine forwards deltas immediately via `send_message(...)`.
3. Tool execution adds explicit lifecycle events and code updates.

Typical per-turn stream sequence:

1. thinking/assistant deltas
2. tool call deltas (optional)
3. `toolStart`
4. `setCode` previews (for `create_file`, optional)
5. `toolResult`
6. next model turn starts, repeat

Finalization:

- If no more tool calls, engine returns final code from in-memory file state.
- If file state is empty, engine tries HTML extraction from final assistant text.

## Module Map

- Engine orchestration: `backend/agent/engine.py`
- Agent entrypoint: `backend/agent/runner.py`
- Provider factory: `backend/agent/providers/factory.py`
- Provider contract: `backend/agent/providers/base.py`
- Provider implementations:
  - `backend/agent/providers/openai.py`
  - `backend/agent/providers/anthropic.py`
  - `backend/agent/providers/gemini.py`
- Tool system:
  - `backend/agent/tools/definitions.py`
  - `backend/agent/tools/runtime.py`
  - `backend/agent/tools/parsing.py`
  - `backend/agent/tools/summaries.py`
