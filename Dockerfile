FROM node:20-alpine as build-frontend
WORKDIR /app
RUN corepack enable

COPY ./frontend /app/
ENV VITE_IS_WEB_UI_MODE=true
RUN yarn install && yarn build


FROM thehale/python-poetry as build-backend
RUN apt update && apt install -y binutils
WORKDIR /app
COPY ./backend /app/
RUN poetry install --no-interaction
RUN poetry run pyinstaller --clean --onefile --name backend main.py


FROM debian:bookworm-slim
ENV FASTAPI_ENV=production
ENV OPENAI_API_KEY=
WORKDIR /app
COPY --from=build-frontend /app/dist /app/webui
COPY --from=build-backend /app/dist/backend /app/backend

EXPOSE 8000
CMD ["/app/backend"]