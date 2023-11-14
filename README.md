# screenshot-to-html

This is a simple app that converts a screenshot to HTML (uses Tailwind CSS). It uses GPT-4 Vision to generate the code.

[Video GIF]

## Getting Started

The app has a React/Vite front-end and a FastAPI backend. You will need an OpenAI API key with access to the GPT-4 Vision API.

In the root directory,

```bash
cd backend
echo "OPENAI_API_KEY=sk-your-key" > .env
poetry install
poetry run uvicorn main:app --reload --port 7000
cd ..
cd frontend
yarn
yarn dev
```

Open http://localhost:5173 to use the app.

If you prefer to run the backend on a different port, just modify VITE_WS_BACKEND_URL=ws://127.0.0.1:7000 in .env.local.

## Hosted Version

Hosted version coming soon at https://picoapps.xyz
