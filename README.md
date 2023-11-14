### Setup Instructions

Run the backend

```bash
poetry install
poetry run uvicorn main:app --reload --port 7000
```

Run the frontend,

```bash
yarn
yarn dev
```

### Environment Variables

.env.local contains
VITE_WS_BACKEND_URL=ws://127.0.0.1:7000
