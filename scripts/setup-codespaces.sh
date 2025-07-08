#!/bin/bash

# Setup script for GitHub Codespaces
# This script automatically configures the correct URLs after Codespaces restart

echo "🚀 Setting up Image-to-Code for Codespaces..."

# Check if we're in Codespaces
if [ -n "$CODESPACE_NAME" ]; then
    echo "✅ Running in GitHub Codespaces: $CODESPACE_NAME"
    
    # Set backend URLs
    BACKEND_URL="https://$CODESPACE_NAME-7001.app.github.dev"
    WS_BACKEND_URL="wss://$CODESPACE_NAME-7001.app.github.dev"
    
    echo "🔧 Setting backend URLs:"
    echo "   HTTP: $BACKEND_URL"
    echo "   WebSocket: $WS_BACKEND_URL"
    
    # Update frontend .env.local
    cat > /workspaces/Image-to-Code/frontend/.env.local << EOF
# Auto-generated for Codespaces
VITE_WS_BACKEND_URL=$WS_BACKEND_URL
VITE_HTTP_BACKEND_URL=$BACKEND_URL
EOF
    
    echo "✅ Frontend .env.local updated"
    
    # Frontend URL
    FRONTEND_URL="https://$CODESPACE_NAME-5173.app.github.dev"
    echo "🌐 Frontend will be available at: $FRONTEND_URL"
    
else
    echo "⚠️  Not running in Codespaces, using localhost URLs"
    
    # Set localhost URLs for local development
    cat > /workspaces/Image-to-Code/frontend/.env.local << EOF
# Local development URLs
VITE_WS_BACKEND_URL=ws://localhost:7001
VITE_HTTP_BACKEND_URL=http://localhost:7001
EOF
    
    echo "✅ Frontend .env.local updated for localhost"
    echo "🌐 Frontend will be available at: http://localhost:5173"
fi

echo "🎉 Setup complete!"
