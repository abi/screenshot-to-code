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
- SaaS backend (FastAPI, `:8001`): from saas `backend/`, `unset IS_PROD` (injected `IS_PROD=True` enables Sentry + cron — unset for local dev) and `export API_SECRET="$BACKEND_SAAS_API_SECRET"` (must equal the codegen backend's secret), then `poetry run python start.py`. It also needs the Clerk secrets (`CLERK_DOMAIN`, `CLERK_SECRET_KEY`, `CLERK_BACKEND_URL`, `ADMIN_CLERK_DOMAIN`) in its process env to validate JWTs.
- Codegen backend (`hosted` branch of THIS repo, `:7001`): check out `hosted` (a `git worktree` avoids leaving your branch), `cd backend`, `unset IS_PROD`, `export BACKEND_SAAS_URL=http://127.0.0.1:8001`, `poetry run uvicorn main:app --reload --port 7001`. Uses `PLATFORM_OPENAI_API_KEY` / `PLATFORM_ANTHROPIC_API_KEY` / `PLATFORM_GEMINI_API_KEY` for paid/subscriber generations. (Does NOT itself need Clerk keys; it forwards the user's JWT to the saas backend.)
- Admin console (Vite, `:5900`): from saas `admin/`, `pnpm dev`; canonical lint/typecheck are `pnpm run lint` / `pnpm run typecheck`.
- Hosted frontend (Vite, `:5175`): from `hosted` `frontend/`, `pnpm run dev-hosted`. Reads `frontend/.env.prod` (gitignored): set `VITE_IS_DEPLOYED=true`, `VITE_SAAS_BACKEND_URL=http://127.0.0.1:8001`, `VITE_WS_BACKEND_URL`/`VITE_HTTP_BACKEND_URL` pointing at the codegen backend, and `VITE_CLERK_PUBLISHABLE_KEY` + `VITE_STRIPE_PUBLISHABLE_KEY`.

Auth / secrets (all required Clerk + Stripe values are injected as env vars):
- Server-to-server: `/generations/store` and `/assets/*` use a shared `API_SECRET` (= injected `BACKEND_SAAS_API_SECRET`) — exercisable WITHOUT Clerk.
- User routes (`/users/*`, `/credits/*`, `/payments/*`, `/api/design-systems`) require a Clerk JWT. The saas process must have `CLERK_DOMAIN` set, otherwise it builds `https://None/.well-known/jwks.json` and every authed route 500s with "name resolution" errors (which surface in the UI as a "Could not load design systems from the backend" toast). If you change/inject secrets mid-session, RESTART the service — long-running processes keep their original env.
- Clerk is a dev (`pk_test`) instance: sign up in the UI with a `something+clerk_test@example.com` email and the fixed verification code `424242` (no real inbox needed). Clerk also blocks breached passwords, so use a strong unique one.
- Granting generation access locally (a brand-new user is `not_subscriber`): either (a) the user lands in the `delayed_paywall` A/B group, which grants 1 free generation — the group is a deterministic hash of the email in `frontend/src/lib/experiment.ts`; or (b) simplest/deterministic: `UPDATE users SET subscriber_tier='pro' WHERE email='…'` in `s2c_saas` (then reload the app). `subscriber_tier` allowed values: `hobby`, `pro`.
- Headless auth testing (no browser): mint a Clerk session JWT with `CLERK_SECRET_KEY` against the Clerk Backend API (`$CLERK_BACKEND_URL`) — `POST $CLERK_BACKEND_URL/v1/sessions {"user_id":…}` then `POST $CLERK_BACKEND_URL/v1/sessions/{id}/tokens` (send `Content-Type: application/json` with a body, e.g. `{"expires_in_seconds":600}`) — and call saas endpoints with `Authorization: Bearer <jwt>`. (Note: bash's `$UID` is reserved; use another var name. URL-encode `+` as `%2B` in the users query.)
- `IMPERSONATE_USER_EMAIL` is NOT a full bypass (it overrides `sub` only AFTER JWT validation, and requires that email to already exist in the DB). Do not set it for normal local testing.
- `STRIPE_*` is only for checkout/billing; `AWS_*` (S3) only for persisting generation images/videos; neither is needed to boot.
