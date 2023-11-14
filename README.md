[Video Demo]

### Instructions

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

## Hosted Version

Hosted version coming soon at https://picoapps.xyz

### Environment Variables

.env.local contains
VITE_WS_BACKEND_URL=ws://127.0.0.1:7000
