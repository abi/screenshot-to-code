#!/bin/bash

# Complete startup script for Image-to-Code in GitHub Codespaces
# Run this after Codespaces restart to get everything working

set -e  # Exit on any error

echo "🚀 Starting Image-to-Code setup for Codespaces..."

# 1. Setup environment URLs
./scripts/setup-codespaces.sh

echo ""
echo "🐳 Setting up Docker containers..."

# 2. Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# 3. Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up --build -d

# 4. Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# 5. Check service status
echo "🔍 Checking service status..."

# Check backend
if curl -s "http://localhost:7001/health" > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend might still be starting..."
fi

# Check frontend
if curl -s "http://localhost:5173" > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend might still be starting..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 Access the app at:"
if [ -n "$CODESPACE_NAME" ]; then
    echo "   🌐 Frontend: https://$CODESPACE_NAME-5173.app.github.dev"
    echo "   🔧 Backend:  https://$CODESPACE_NAME-7001.app.github.dev"
else
    echo "   🌐 Frontend: http://localhost:5173"
    echo "   🔧 Backend:  http://localhost:7001"
fi
echo ""
echo "📝 To see logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
