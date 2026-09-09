# Render + 9Router deployment

This fork can run as one Render Web Service. The React frontend is built into the Docker image and served by FastAPI; `/generate-code` remains a WebSocket endpoint.

## Required Render environment variables

- `OPENAI_API_KEY`: your 9Router API key. Keep this in Render Secrets; never commit it.
- `OPENAI_BASE_URL`: `https://9router.com/v1`
- `ROUTER_MODEL`: a 9Router model ID that supports vision/image input and tool calling.

The included `render.yaml` configures the remaining deployment settings for the free plan.

## Important

The free Render instance has 512 MB RAM, so the deployment disables the optional local Chromium screenshot-preview tool. Core screenshot-to-code generation still works through the router.

Free Render services also sleep after 15 minutes without inbound traffic and have an ephemeral filesystem, so uploaded/local files are not durable across restarts.
