# screenshot-to-code

This simple app converts a screenshot to code (HTML/Tailwind CSS, or React or Vue or Bootstrap). It uses GPT-4 Vision to generate the code and DALL-E 3 to generate similar-looking images. You can now also enter a URL to clone a live website!

https://github.com/abi/screenshot-to-code/assets/23818/6cebadae-2fe3-4986-ac6a-8fb9db030045

See the [Examples](#examples) section below for more demos.

## 🚀 Try It Out!

🆕 [Try it here](https://screenshottocode.com) (bring your own OpenAI key - **your key must have access to GPT-4 Vision. See [FAQ](#%EF%B8%8F-faqs) section below for details**). Or see [Getting Started](#-getting-started) below for local install instructions.

## 🌟 Recent Updates

- Nov 30 - Dark mode, output code in Ionic (thanks [@dialmedu](https://github.com/dialmedu)), set OpenAI base URL
- Nov 28 - 🔥 🔥 🔥 Customize your stack: React or Bootstrap or TailwindCSS
- Nov 23 - Send in a screenshot of the current replicated version (sometimes improves quality of subsequent generations)
- Nov 21 - Edit code in the code editor and preview changes live thanks to [@clean99](https://github.com/clean99)
- Nov 20 - Paste in a URL to screenshot and clone (requires [ScreenshotOne free API key](https://screenshotone.com?via=screenshot-to-code))
- Nov 19 - Support for dark/light code editor theme - thanks [@kachbit](https://github.com/kachbit)
- Nov 16 - Added a setting to disable DALL-E image generation if you don't need that
- Nov 16 - View code directly within the app
- Nov 15 - You can now instruct the AI to update the code as you wish. It is helpful if the AI messed up some styles or missed a section.

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
