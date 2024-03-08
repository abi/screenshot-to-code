# screenshot-to-code

This simple app converts a screenshot to code (HTML/Tailwind CSS, or React or Bootstrap or Vue). It uses GPT-4 Vision (or Claude 3) to generate the code and DALL-E 3 to generate similar-looking images. You can now also enter a URL to clone a live website.

🆕 Now, supporting Claude 3!

https://github.com/abi/screenshot-to-code/assets/23818/6cebadae-2fe3-4986-ac6a-8fb9db030045

See the [Examples](#-examples) section below for more demos.

[Follow me on Twitter for updates](https://twitter.com/_abi_).

## 🚀 Try It Out!

🆕 [Try it here](https://screenshottocode.com) (bring your own OpenAI key - **your key must have access to GPT-4 Vision. See [FAQ](#%EF%B8%8F-faqs) section below for details**). Or see [Getting Started](#-getting-started) below for local install instructions.

## 🌟 Recent Updates

- Mar 8 - 🔥🎉🎁 Video-to-app: turn videos/screen recordings into functional apps
- Mar 5 - Added support for Claude Sonnet 3 (as capable as or better than GPT-4 Vision, and faster!)

## 🛠 Getting Started

The app has a React/Vite frontend and a FastAPI backend. You will need an OpenAI API key with access to the GPT-4 Vision API.

Run the backend (I use Poetry for package management - `pip install poetry` if you don't have it):

```bash
cd backend
echo "OPENAI_API_KEY=sk-your-key" > .env
poetry install
poetry shell
poetry run uvicorn main:app --reload --port 7001
```

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
MOCK=true poetry run uvicorn main:app --reload --port 7001
```

## Video to app (experimental)

https://github.com/abi/screenshot-to-code/assets/23818/1468bef4-164f-4046-a6c8-4cfc40a5cdff

Record yourself using any website or app or even a Figma prototype, drag & drop in a video and in a few minutes, get a functional, similar-looking app.

[You need an Anthropic API key for this functionality. Follow instructions here.](https://github.com/abi/screenshot-to-code/blob/main/blog/video-to-app.md)

## Configuration

- You can configure the OpenAI base URL if you need to use a proxy: Set OPENAI_BASE_URL in the `backend/.env` or directly in the UI in the settings dialog

## Using Claude 3

We recently added support for Claude 3 Sonnet. It performs well, on par or better than GPT-4 vision for many inputs, and it tends to be faster.

1. Add an env var `ANTHROPIC_API_KEY` to `backend/.env` with your API key from Anthropic
2. When using the front-end, select "Claude 3 Sonnet" from the model dropdown

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

🆕 [Try it here](https://screenshottocode.com) (bring your own OpenAI key - **your key must have access to GPT-4 Vision. See [FAQ](#%EF%B8%8F-faqs) section for details**). Or see [Getting Started](#-getting-started) for local install instructions.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/abiraja)
