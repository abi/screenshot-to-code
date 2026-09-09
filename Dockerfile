# ---------- Frontend build ----------
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
ENV VITE_IS_DEPLOYED=true
RUN pnpm build-hosted

# ---------- Backend runtime ----------
FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=2.4.1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app
RUN pip install --no-cache-dir "poetry==$POETRY_VERSION"

COPY backend/pyproject.toml backend/poetry.lock /app/backend/
WORKDIR /app/backend
RUN poetry install --only main --no-interaction --no-ansi

# Render free is only 512 MB RAM. Chromium is intentionally not installed;
# render.yaml disables the optional screenshot-preview tool.
COPY backend/ /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 10000
WORKDIR /app/backend
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
