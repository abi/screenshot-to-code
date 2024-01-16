FROM node:20-alpine as build-frontend
WORKDIR /app
RUN corepack enable

COPY ./frontend /app/
ENV VITE_IS_WEB_UI_MODE=true
COPY ./frontend/yarn.lock ./frontend/package.json /app/
RUN --mount=type=cache,id=yarn-cache,target=/root/.cache/yarn \
  yarn install --frozen-lockfile
COPY ./frontend /app/
RUN yarn build


FROM acidrain/python-poetry:3.12-alpine as build-backend
RUN apk add binutils
WORKDIR /app
COPY ./backend/poetry.lock ./backend/pyproject.toml /app/
RUN --mount=type=cache,id=poetry-cache,target=/root/.cache/pypoetry/cache \
  --mount=type=cache,id=poetry-artifacts,target=/root/.cache/pypoetry/artifacts \
  poetry install --no-interaction --no-ansi
COPY ./backend /app/
RUN poetry run pyinstaller --clean --onefile --name backend main.py


FROM alpine:latest
ENV FASTAPI_ENV=production
ENV OPENAI_API_KEY=
WORKDIR /app
COPY --from=build-frontend /app/dist /app/webui
COPY --from=build-backend /app/dist/backend /app/backend

EXPOSE 8000
CMD ["/app/backend"]