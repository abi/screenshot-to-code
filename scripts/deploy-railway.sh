#!/bin/bash

echo "🚀 Deploying Image-to-Code to Railway..."

# Install Railway CLI if not installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
fi

# Login to Railway
echo "🔐 Login to Railway..."
railway login

# Create new project
echo "📦 Creating Railway project..."
railway link

# Deploy
echo "🌐 Deploying..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "🔧 Set environment variables in Railway dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - ANTHROPIC_API_KEY"
echo "   - GEMINI_API_KEY"
echo ""
echo "📱 Your app will be available at your Railway domain"
