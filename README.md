# screenshot-to-code

Convert screenshots, mockups, Figma designs, and screen recordings into clean, functional code using AI. The easiest way to try this is using <a href="https://screenshottocode.com/?utm_source=github&utm_medium=readme&utm_campaign=oss_readme&utm_content=top_cta" target="_blank" rel="noopener noreferrer">the official, hosted product at screenshottocode.com →</a>

https://github.com/user-attachments/assets/85b911c0-efea-4957-badb-daa97ec402ad

Supported stacks:

- HTML + Tailwind
- HTML + CSS
- React + Tailwind
- Vue + Tailwind
- Bootstrap
- Ionic + Tailwind

Default AI models:

- Gemini 3 Flash Preview and Gemini 3.1 Pro Preview - the best models
- GPT-5.5, GPT-5.2 Codex, and GPT-5.4 Mini
- Claude Opus 4.6, Claude Opus 4.8
- z-image-turbo (using Replicate) for image generation

See the [Examples](#-examples) section below for more demos.

Screenshot to Code also supports taking a screen recording of a website in action and turning that into a functional prototype.

![google in app quick 3](https://github.com/abi/screenshot-to-code/assets/23818/8758ffa4-9483-4b9b-bb66-abd6d1594c33)

## 🛠 Getting Started

Choose the path that fits what you want to do:

- **Run locally:** best if you want to customize, self-host, or contribute.
- **Use the hosted app:** the fastest way to try Screenshot to Code with no local setup. <a href="https://screenshottocode.com/?utm_source=github&utm_medium=readme&utm_campaign=oss_readme&utm_content=getting_started_cta" target="_blank" rel="noopener noreferrer">Open the hosted app →</a>

Running locally requires API keys and a backend/frontend setup. The app has a React/Vite frontend and a FastAPI backend.

Keys needed:

- An [OpenAI API key](https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md), Anthropic key, or Google Gemini key
- Multiple keys are recommended so you can compare results from different models

If you'd like to run the app with Ollama open-source models (not recommended due to poor-quality results), [follow this comment](https://github.com/abi/screenshot-to-code/issues/354#issuecomment-2435479853).

Run the backend (I use Poetry for package management; run `pip install --upgrade poetry` if you don't have it):

```bash
cd backend
echo "OPENAI_API_KEY=sk-your-key" > .env
echo "ANTHROPIC_API_KEY=your-key" >> .env
echo "GEMINI_API_KEY=your-key" >> .env
poetry install
poetry env activate
# run the printed command, e.g. source /path/to/venv/bin/activate
poetry run uvicorn main:app --reload --port 7001
```

You can also set up the keys using the settings dialog in the frontend (click the gear icon after loading the app).

Run the frontend:

```bash
cd frontend
yarn
yarn dev
```

Open http://localhost:5173 to use the app.

If you prefer to run the backend on a different port, update `VITE_WS_BACKEND_URL` in `frontend/.env.local`.

## Docker

If you have Docker installed, run this from the root directory:

```bash
echo "OPENAI_API_KEY=sk-your-key" > .env
docker-compose up -d --build
```

The app will be up and running at http://localhost:5173. Note that you can't develop the application with this setup, as file changes won't trigger a rebuild.

## 🙋‍♂️ FAQs

- **I'm running into an error when setting up the backend. How can I fix it?** [Try this](https://github.com/abi/screenshot-to-code/issues/3#issuecomment-1814777959). If that still doesn't work, open an issue.
- **How do I get an OpenAI API key?** See https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md
- **How can I configure an OpenAI proxy?** If you're not able to access the OpenAI API directly, for example because of country restrictions, you can try a VPN or configure the OpenAI base URL to use a proxy. Set `OPENAI_BASE_URL` in `backend/.env` or directly in the UI in the settings dialog. Make sure the URL has `v1` in the path, for example: `https://xxx.xxxxx.xxx/v1`.
- **How can I update the backend host that my frontend connects to?** Configure `VITE_HTTP_BACKEND_URL` and `VITE_WS_BACKEND_URL` in `frontend/.env.local`. For example, set `VITE_HTTP_BACKEND_URL=http://124.10.20.1:7001`.
- **Seeing UTF-8 errors when running the backend?** On Windows, open the `.env` file with Notepad++, then go to Encoding and select UTF-8.
- **How can I provide feedback?** For feedback, feature requests, and bug reports, open an issue or ping me on [Twitter](https://twitter.com/_abi_).

## 📚 Examples

**NYTimes**

| Original                                                                                                                                                        | Replica                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img width="1238" alt="Screenshot 2023-11-20 at 12 54 03 PM" src="https://github.com/user-attachments/assets/6b0ae86c-1b0f-4598-a578-c7b62205b3e2"> | <img width="1414" alt="Screenshot 2023-11-20 at 12 59 56 PM" src="https://github.com/user-attachments/assets/981c490e-9be6-407e-8e46-2642f0ca613e"> |


**Instagram**

https://github.com/user-attachments/assets/a335a105-f9cc-40e6-ac6b-64e5390bfc21

**Hacker News**


https://github.com/user-attachments/assets/205cb5c7-9c3c-438d-acd4-26dfe6e077e5
