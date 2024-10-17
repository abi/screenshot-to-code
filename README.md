# screenshot-to-code

A simple tool to convert screenshots, mockups and Figma designs into clean, functional code using AI. **Now supporting Claude Sonnet 3.5 and GPT-4O!**

https://github.com/abi/screenshot-to-code/assets/23818/6cebadae-2fe3-4986-ac6a-8fb9db030045

Supported stacks:

- HTML + Tailwind
- HTML + CSS
- React + Tailwind
- Vue + Tailwind
- Bootstrap
- Ionic + Tailwind
- SVG

Supported AI models:

- Claude Sonnet 3.5 - Best model!
- GPT-4O - also recommended!
- GPT-4 Turbo (Apr 2024)
- GPT-4 Vision (Nov 2023)
- Claude 3 Sonnet
- DALL-E 3 for image generation

See the [Examples](#-examples) section below for more demos.

We also just added experimental support for taking a video/screen recording of a website in action and turning that into a functional prototype.

![google in app quick 3](https://github.com/abi/screenshot-to-code/assets/23818/8758ffa4-9483-4b9b-bb66-abd6d1594c33)

[Learn more about video here](https://github.com/abi/screenshot-to-code/wiki/Screen-Recording-to-Code).

[Follow me on Twitter for updates](https://twitter.com/_abi_).

## 🚀 Hosted Version

[Try it live on the hosted version (paid)](https://screenshottocode.com).

## 🛠 Getting Started

The app has a React/Vite frontend and a FastAPI backend.

Keys needed:

- [OpenAI API key with access to GPT-4](https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md)
- Anthropic key (optional) - only if you want to use Claude Sonnet, or for experimental video support.

Run the backend (I use Uv for package management - `pip install uv` if you don't have it):

```bash
cd backend
echo "OPENAI_API_KEY=sk-your-key" > src/screenshot_to_code/.env
uv pip install .
uv run uvicorn screenshot_to_code:app --reload --port 7001
```

If you want to use Anthropic, add `ANTHROPIC_API_KEY` to `backend/src/screenshot_to_code/.env`. You can also set up the keys using the settings dialog on the front-end (click the gear icon after loading the frontend).

Run the frontend:

```bash
cd frontend
yarn
yarn dev
```

Open http://localhost:5173 to use the app.

If you prefer to run the backend on a different port, update VITE_WS_BACKEND_URL in `frontend/.env.local`

For debugging purposes, if you don't want to waste GPT4-Vision credits, you can run the backend in mock mode (which streams a pre-recorded response):

```bash
MOCK=true uv run uvicorn screenshot_to_code:app --reload --port 7001
```

## Docker

If you have Docker installed on your system, in the root directory, run:

```bash
echo "OPENAI_API_KEY=sk-your-key" > .env
docker-compose up -d --build
```

The app will be up and running at http://localhost:5173. Note that you can't develop the application with this setup as the file changes won't trigger a rebuild.

## 🙋‍♂️ FAQs

- **I'm running into an error when setting up the backend. How can I fix it?** [Try this](https://github.com/abi/screenshot-to-code/issues/3#issuecomment-1814777959). If that still doesn't work, open an issue.
- **How do I get an OpenAI API key?** See https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md
- **How can I configure an OpenAI proxy?** - If you're not able to access the OpenAI API directly (due to e.g. country restrictions), you can try a VPN or you can configure the OpenAI base URL to use a proxy: Set OPENAI_BASE_URL in the `backend/.env` or directly in the UI in the settings dialog. Make sure the URL has "v1" in the path so it should look like this: `https://xxx.xxxxx.xxx/v1`
- **How can I update the backend host that my front-end connects to?** - Configure VITE_HTTP_BACKEND_URL and VITE_WS_BACKEND_URL in front/.env.local For example, set VITE_HTTP_BACKEND_URL=http://124.10.20.1:7001
- **Seeing UTF-8 errors when running the backend?** - On windows, open the .env file with notepad++, then go to Encoding and select UTF-8.
- **How can I provide feedback?** For feedback, feature requests and bug reports, open an issue or ping me on [Twitter](https://twitter.com/_abi_).

## 📚 Examples

**NYTimes**

| Original                                                                                                                                                        | Replica                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img width="1238" alt="Screenshot 2023-11-20 at 12 54 03 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/3b644dfa-9ca6-4148-84a7-3405b6671922"> | <img width="1414" alt="Screenshot 2023-11-20 at 12 59 56 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/26201c9f-1a28-4f35-a3b1-1f04e2b8ce2a"> |

**Instagram page (with not Taylor Swift pics)**

https://github.com/abi/screenshot-to-code/assets/23818/503eb86a-356e-4dfc-926a-dabdb1ac7ba1

**Hacker News** but it gets the colors wrong at first so we nudge it

https://github.com/abi/screenshot-to-code/assets/23818/3fec0f77-44e8-4fb3-a769-ac7410315e5d

## 🌍 Hosted Version

🆕 [Try it here (paid)](https://screenshottocode.com). Or see [Getting Started](#-getting-started) for local install instructions to use with your own API keys.
