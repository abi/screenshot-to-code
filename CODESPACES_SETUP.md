# 🚀 Quick Start for GitHub Codespaces

After restarting Codespaces, follow these steps to get Image-to-Code running:

## Option 1: Automatic Setup (Recommended)

```bash
./scripts/start.sh
```

This will automatically:
- ✅ Configure the correct Codespaces URLs
- ✅ Build and start Docker containers
- ✅ Wait for services to be ready
- ✅ Show you the access URLs

## Option 2: Manual Setup

### Step 1: Configure URLs
```bash
./scripts/setup-codespaces.sh
```

### Step 2: Start Docker
```bash
docker-compose up --build -d
```

### Step 3: Check Status
```bash
docker-compose logs -f
```

## Access the App

After setup, your app will be available at:
- **Frontend**: `https://{CODESPACE_NAME}-5173.app.github.dev`
- **Backend**: `https://{CODESPACE_NAME}-7001.app.github.dev`

The exact URLs will be shown after running the setup script.

## Environment Variables

Make sure your API keys are set in `/workspaces/Image-to-Code/.env`:

```bash
# Required: At least one of these
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  
GEMINI_API_KEY=your_gemini_key_here

# Optional
REPLICATE_API_KEY=your_replicate_key_here
```

## Troubleshooting

### Container Issues
```bash
# Stop everything
docker-compose down --remove-orphans

# Rebuild from scratch
docker-compose up --build
```

### URL Issues
```bash
# Reconfigure URLs
./scripts/setup-codespaces.sh

# Restart frontend
docker-compose restart frontend
```

### Check Health
```bash
# Backend health
curl https://{CODESPACE_NAME}-7001.app.github.dev/health

# View logs
docker-compose logs backend
docker-compose logs frontend
```

## Current Model Configuration

When using Gemini API key only:
- **Variant 1**: Gemini 2.0 Flash
- **Variant 2**: Gemini 1.5 Flash  
- **Variant 3**: Gemini 2.0 Flash
- **Variant 4**: Gemini 1.5 Flash
