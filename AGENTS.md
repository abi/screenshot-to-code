# Project Agent Instructions

Python environment:

- Always use the backend Poetry virtualenv (`backend-py3.10`) for Python commands.
- Preferred invocation: `cd backend && poetry run <command>`.
- If you need to activate directly, use Poetry to discover it in the current environment:
  - `cd backend && poetry env activate` (then run the `source .../bin/activate` command it prints)

Testing policy:

- Always run backend tests after every code change: `cd backend && poetry run pytest`.
- Always run type checking after every code change: `cd backend && poetry run pyright`.
- Type checking policy: no new warnings in changed files (`pyright`).

## Frontend

- Frontend: `cd frontend && pnpm lint`

If changes touch both, run both sets.

## Prompt formatting

- Prefer triple-quoted strings (`"""..."""`) for multi-line prompt text.
- For interpolated multi-line prompts, prefer a single triple-quoted f-string over concatenated string fragments.

# Hosted

The hosted version is on the `hosted` branch. The `hosted` branch connects to a saas backend, which is a seperate codebase at ../screenshot-to-code-saas

## Cursor Cloud specific instructions

Dependencies are refreshed automatically on startup (`poetry install` in `backend/`, `pnpm install` in `frontend/`, plus the sibling `../screenshot-to-code-saas` `backend/` and `admin/`); no manual install is needed.

Services (see `README.md` for the canonical commands):
- Backend (FastAPI + WebSocket): from `backend/`, `poetry run uvicorn main:app --reload --port 7001`.
- Frontend (Vite/React): from `frontend/`, `pnpm dev` → open `http://localhost:5173`. The Vite dev server binds to `localhost` only, so use `http://localhost:5173`, not `http://127.0.0.1:5173` (the latter refuses the connection).
- Frontend talks to the backend over a WebSocket (`VITE_WS_BACKEND_URL`, default `ws://127.0.0.1:7001`); generation streams over that socket, other routes are plain HTTP.

Non-obvious caveats:
- To run/test against the **saas backend** (`../screenshot-to-code-saas`), you must be on the `hosted` branch of this repo — the default `main` branch frontend talks directly to the local FastAPI backend, not the saas backend.
- `poetry` is installed under `~/.local/bin` and is on PATH for interactive shells (`.bashrc`) but not necessarily for non-interactive scripts; use the full path `~/.local/bin/poetry` if `poetry` is not found.
- The Poetry virtualenv resolves to Python 3.12 (named like `backend-...-py3.12`), not 3.10 — `pyproject.toml` pins `^3.10`, which 3.12 satisfies. Just use `poetry run`.
- Core feature (screenshot → code) requires at least one LLM key: set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` in `backend/.env` (restart backend after editing) or in the in-app Settings dialog. Without a key, generation fails fast with a "No OpenAI, Anthropic, or Gemini API key" message. `REPLICATE_API_KEY` (image gen/edit) only works via `backend/.env`, not the UI.
- Playwright Chromium is pre-installed for the optional "Screenshot preview" tool; Settings shows it as "Available".
- `pnpm install` prints an "Ignored build scripts (esbuild, puppeteer)" warning — this is harmless; Vite build/dev and tests work without approving builds.
- `cd frontend && pnpm lint` currently reports pre-existing errors (e.g. `@typescript-eslint/no-explicit-any` in `generateCode.ts`) because lint runs with `--max-warnings 0`; these are baseline issues, not environment problems.

### Hosted product (`hosted` branch + `../screenshot-to-code-saas`)

The OSS `main` flow above needs none of this. The full hosted product is 4 services + PostgreSQL + Clerk. Deps for the saas repo (`backend/` poetry, `admin/` pnpm) are refreshed by the startup update script.

PostgreSQL (system dep + local DB are persisted in the VM snapshot, NOT in the update script):
- Postgres 16 cluster `16 main` on `:5432`; it does not auto-start — run `sudo pg_ctlcluster 16 main start` after a fresh boot.
- Local dev DB already created: role `s2c` / password `s2c_local_pw`, database `s2c_saas`. `screenshot-to-code-saas/backend/.env` sets `DB_DSN=postgresql://s2c:s2c_local_pw@127.0.0.1:5432/s2c_saas`.
- Schema is in `screenshot-to-code-saas/backend/setup.sql`; (re)apply with `PGPASSWORD=s2c_local_pw psql -h 127.0.0.1 -U s2c -d s2c_saas -f setup.sql`. NOTE: `setup.sql` has a few pre-existing SQL errors (e.g. a trailing comma in `user_checkout_sessions`, and a broken `sent_emails` statement); psql skips just those statements and still builds the core tables (`users`, `generations`, `credits`, …). Do NOT use `-v ON_ERROR_STOP=1`.

Services (all default to `127.0.0.1`):
- SaaS backend (FastAPI, `:8001`): from saas `backend/`, `unset IS_PROD` (injected `IS_PROD=True` enables Sentry + cron — unset for local dev) and `export API_SECRET="$BACKEND_SAAS_API_SECRET"` (must equal the codegen backend's secret), then `poetry run python start.py`.
- Codegen backend (`hosted` branch of THIS repo, `:7001`): check out `hosted` (a `git worktree` avoids leaving your branch), `cd backend`, `unset IS_PROD`, `export BACKEND_SAAS_URL=http://127.0.0.1:8001`, `poetry run uvicorn main:app --reload --port 7001`.
- Admin console (Vite, `:5900`): from saas `admin/`, `pnpm dev`; canonical lint/typecheck are `pnpm run lint` / `pnpm run typecheck`.
- Hosted frontend (Vite, `:5175`): from `hosted` `frontend/`, `pnpm run dev-hosted`.

Auth / what works without external accounts:
- `/generations/store` and `/assets/*` use a shared `API_SECRET` (set it to the injected `BACKEND_SAAS_API_SECRET`) — exercisable server-to-server WITHOUT Clerk.
- All user routes (`/users/*`, `/credits/*`, `/payments/*`) require a Clerk JWT, and BOTH frontends throw on a missing `VITE_CLERK_PUBLISHABLE_KEY`. Without Clerk credentials the login + end-to-end hosted generation UI cannot run. `IMPERSONATE_USER_EMAIL` is NOT a full bypass (it overrides `sub` only after JWT validation, so a valid Clerk token is still required).
- `STRIPE_*` is only for checkout/billing; `AWS_*` (S3) only for persisting generation images/videos; neither is needed to boot.
