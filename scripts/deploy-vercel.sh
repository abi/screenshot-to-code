#!/bin/bash

echo "🚀 Deploying Image-to-Code to Vercel..."

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔧 Don't forget to set environment variables in Vercel dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - ANTHROPIC_API_KEY" 
echo "   - GEMINI_API_KEY"
echo ""
echo "📱 Your app will be available at the URL shown above"
