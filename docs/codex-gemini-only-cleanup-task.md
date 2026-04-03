# Codex Task — Gemini-only cleanup + upload/start fix

Repository: `arty69x/screenshot-to-code`

Do all work in this repository only.

## Goal

Make the app usable again for screenshot/image upload and generation start, and simplify the project so Gemini is the only AI provider left.

## What is currently wrong

### 1) Multi-provider setup still exists and must be removed

The repo is not Gemini-only right now.

- Frontend default settings still include `openAiApiKey`, `openAiBaseURL`, `anthropicApiKey`, and default `codeGenerationModel` is Claude in `frontend/src/App.tsx`.
- Frontend settings type still includes OpenAI + Anthropic + Gemini in `frontend/src/types.ts`.
- Frontend model list in `frontend/src/lib/models.ts` still contains Claude and GPT models.
- Backend route `backend/routes/generate_code.py` still imports and uses OpenAI, Anthropic, Gemini, OpenAI base URL, Replicate, and provider-mixing model sets.
- Backend config `backend/config.py` still exposes OpenAI / Anthropic / Gemini / OpenAI base URL / Replicate env vars.
- Backend dependency file `backend/pyproject.toml` still includes `openai`, `anthropic`, and `google-genai` together.
- README still advertises Gemini + Claude + GPT, multiple provider keys, OpenAI proxy instructions, and non-Gemini setup paths.

### 2) Upload image then start/generate is currently broken for the user

The user reports that after uploading an image, the app cannot be used and generation/start fails.

You must trace the real failing path end-to-end and fix it, not just hide the error.

Relevant starting points:

- `frontend/src/components/unified-input/tabs/UploadTab.tsx`
- `frontend/src/App.tsx`
- `frontend/src/generateCode.ts`
- `backend/routes/generate_code.py`

## Required final state

### A. Gemini-only product

After your change, Gemini must be the only supported AI provider.

Remove all non-Gemini provider code, config, docs, selectors, env handling, and dead paths, including:

- OpenAI
- Anthropic / Claude
- Replicate
- DALL-E
- Flux
- Ollama
- any other provider-specific leftover code

Keep only what is strictly required for Gemini-based generation and any non-provider-specific utilities.

### B. Upload/start must work

The user must be able to:

- upload screenshot image(s)
- click Generate Code
- successfully start generation

Also verify video path only if it is still intentionally supported after the Gemini-only cleanup. If video is not stable or no longer needed, remove it cleanly instead of leaving a broken path.

## Specific implementation requirements

### Frontend

1. Change persisted/default settings to Gemini-only.
   - Remove OpenAI and Anthropic settings keys from the settings object and types.
   - Default model must be a Gemini model.
   - Remove provider-specific onboarding/UI that still assumes OpenAI.

2. Remove provider model clutter.
   - `frontend/src/lib/models.ts` must only expose Gemini models that are actually supported by the backend.
   - Remove GPT/Claude display names and descriptions.

3. Clean the settings UI.
   - Remove OpenAI / Anthropic / proxy / provider toggle controls.
   - Keep only Gemini-related configuration that is truly needed.

4. Fix upload/start flow.
   - Audit `UploadTab` and generation entry flow.
   - Ensure image upload state, selected files, payload creation, and generate click all work reliably.
   - Add defensive guards and useful user-facing errors if required fields are missing.

5. Make websocket request handling more robust.
   - Keep safe JSON parsing and better message guards in `frontend/src/generateCode.ts`.
   - Surface backend error reasons clearly when start/generation fails.

### Backend

1. Refactor `backend/routes/generate_code.py` to Gemini-only.
   - Remove OpenAI and Anthropic imports, logic, key selection, error branches, and mixed model set selection.
   - Remove OpenAI base URL logic if no longer needed.
   - Remove Replicate references if not required.
   - Simplify model selection so it only validates/picks Gemini models.
   - Error messages must mention only Gemini.

2. Clean backend configuration.
   - `backend/config.py` should only keep env vars actually needed after cleanup.

3. Clean dependencies.
   - Remove non-Gemini AI SDKs from `backend/pyproject.toml`.
   - Remove any unused frontend dependencies if they become dead after cleanup.

4. If video support depends on Gemini and still works, keep it stable.
   - If it is broken and outside necessary scope, remove it cleanly from UI + backend rather than leaving a broken feature.

### Docs / setup

1. Rewrite README to Gemini-only.
   - Setup must mention Gemini key only.
   - Remove OpenAI/Anthropic/proxy/multi-provider guidance.
   - Remove recommendations to compare multiple providers.

2. Update any `.env.example`, Docker, startup docs, or troubleshooting docs accordingly.

## Validation before finishing

You must actually verify the repo works after the cleanup.

Required checks:

1. install dependencies successfully
2. run frontend tests that still apply
3. run backend tests that still apply
4. run a successful frontend build
5. run the app locally
6. verify screenshot/image upload -> Generate Code -> generation start works
7. verify the user can get a usable result without multi-provider setup

## Output requirements

When done, summarize:

1. what caused the upload/start failure
2. exactly what files were changed
3. exactly what non-Gemini systems were removed
4. whether video support was kept or removed
5. any remaining limitation

Prefer deletion over keeping unused abstractions. Keep the system smaller, clearer, and working.