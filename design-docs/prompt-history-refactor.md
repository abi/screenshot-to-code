# Prompt History Refactor (Frontend -> Backend)

## Goal
Simplify edit prompt history so we no longer reconstruct conversation state from commit ancestry and index parity.

The new model is:
- Frontend stores explicit conversation history per variant.
- Frontend sends explicit role-based history to backend.
- Backend trusts structured history and only assembles messages.

## Key decisions (final)
- No `sourceVersionNumber` field is required.
  - The selected variant is the source of truth for "what history to extend next".
- No backend persistence/migration work is needed for this refactor.
  - Prompt history state is frontend-side session/project state.
- No legacy reconstruction parity path.
  - Old reconstruction/index-parity behavior is removed rather than preserved.

## Previous behavior (removed)
Before this refactor:
- Frontend rebuilt history via `extractHistory(...)` by walking commit parent links.
- Backend inferred message role from array index parity (`assistant` for even, `user` for odd).
- History state was implicit and brittle, especially with branching and variant selection.

## New frontend storage model

### 1) Per-variant explicit history
Each variant now carries its own history:
- `Variant.history: VariantHistoryMessage[]`
- `VariantHistoryMessage`:
  - `role: "user" | "assistant"`
  - `text: string`
  - `imageAssetIds: string[]`
  - `videoAssetIds: string[]`

This history is authoritative for that variant.

### 2) Shared media asset store
Frontend keeps media in one shared map:
- `assetsById: Record<string, PromptAsset>`
- `PromptAsset`:
  - `id`
  - `type: "image" | "video"`
  - `dataUrl`

Variant history references media by ID, not by embedding large base64 strings directly.

### 3) Utilities extracted from `App.tsx`
Prompt-history/media helper logic moved to:
- `frontend/src/lib/prompt-history.ts`

Key helpers:
- `cloneVariantHistory(...)`
- `registerAssetIds(...)`
- `toRequestHistory(...)`
- `buildUserHistoryMessage(...)`
- `buildAssistantHistoryMessage(...)`

## How requests are built now

### Create flow
- Create seeds `variantHistory` with a single `user` message.
- Images/videos are registered in `assetsById` and referenced by IDs in the variant history.
- Request payload includes:
  - `prompt` (create input)
  - `variantHistory` (for local commit state)

### Update flow
- Uses the currently selected variant as source of truth.
- Base history = selected variant history (or fallback assistant snapshot of current code if empty).
- Appends new `user` update message (+ optional media IDs).
- Converts variant history into request history (`role`, `text`, `images`, `videos`) via `toRequestHistory(...)`.

### Completion behavior
On variant completion:
- Final generated code is appended as an `assistant` history message for that specific variant.

## Branching behavior
We still keep flat version labels (v1, v2, ...), but edits can branch from any selected version/variant.

Important detail:
- The active selected variant's explicit history is what gets extended for the next edit.
- This naturally supports branching without reconstructing from global commit ancestry.

## Request payload shape (simplified)
When sending an edit, frontend sends explicit role history like:
- `history[i].role`: `"user"` or `"assistant"`
- `history[i].text`: textual instruction or generated code
- `history[i].images`: data URLs for image inputs for that message
- `history[i].videos`: data URLs for video inputs for that message

Backend does not infer roles by index anymore; it uses the provided role directly.

## Backend parsing and prompt assembly

### Request parsing extracted
Raw request normalization moved into:
- `backend/prompts/request_parsing.py`

Functions:
- `parse_prompt_content(raw_prompt)`
- `parse_prompt_history(raw_history)`

`generate_code.py` now calls these helpers, so the route file is smaller and parsing is centralized.

### Prompt assembly changes
`backend/prompts/builders.py` now:
- Consumes explicit `PromptHistoryMessage` entries.
- Uses provided `role` directly (no index parity inference).
- For update generation, builds:
  - `system` message
  - followed by all provided explicit history messages

### Imported-code path
Imported-code update logic now works with explicit role history and chooses the latest relevant `user` instruction cleanly.

## Logging/observability updates
- Removed runtime `PROMPT SUMMARY` logging from generation path.
- Added compact `PROMPT PREVIEW` logging before model execution.
- Large text/code is collapsed for readability.

## Tests updated/added

### Backend
- Updated prompt assembly expectations to explicit role history:
  - `backend/tests/test_prompts.py`
- Merged and removed duplicate file:
  - deleted `backend/tests/test_prompts_additional.py`
- Added request parser tests:
  - `backend/tests/test_request_parsing.py`
- Added prompt preview tests:
  - `backend/tests/test_prompt_summary.py`

### Frontend
- Removed legacy `extractHistory` tests and updated fixtures:
  - `frontend/src/components/history/utils.test.ts`
- Added helper tests for extracted prompt-history utilities:
  - `frontend/src/lib/prompt-history.test.ts`

## Net result
The prompt-history pipeline is now explicit, variant-local, and much easier to reason about:
- No implicit role inference.
- No tree reconstruction for edit prompts.
- Cleaner branch handling via selected variant history.
- Smaller route parsing surface via dedicated parser module.
