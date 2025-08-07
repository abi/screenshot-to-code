#!/bin/bash

# Screenshot to Code - Development Script
# Quick development commands

case "$1" in
    "start"|"")
        ./start.sh
        ;;
    "stop")
        ./stop.sh
        ;;
    "restart")
        ./restart.sh
        ;;
    "backend")
        echo "🔧 Starting backend only..."
        cd backend
        python -m uvicorn main:app --reload --port 7001
        ;;
    "frontend")
        echo "📱 Starting frontend only..."
        cd frontend
        yarn dev
        ;;
    "install")
        echo "📦 Installing dependencies..."
        echo "Backend dependencies..."
        cd backend && pip install fastapi uvicorn websockets openai python-dotenv beautifulsoup4 httpx anthropic moviepy==1.0.3 google-genai && cd ..
        echo "Frontend dependencies..."
        cd frontend && yarn install && cd ..
        echo "✅ All dependencies installed!"
        ;;
    "status")
        echo "🔍 Checking server status..."
        
        # Check PIDs
        BACKEND_PID_FILE="./pids/backend.pid"
        FRONTEND_PID_FILE="./pids/frontend.pid"
        
        echo "Backend:"
        if [ -f "$BACKEND_PID_FILE" ]; then
            BACKEND_PID=$(cat "$BACKEND_PID_FILE")
            if kill -0 "$BACKEND_PID" 2>/dev/null; then
                echo "✅ Running (PID: $BACKEND_PID) - http://127.0.0.1:7001"
            else
                echo "❌ PID file exists but process not running"
                rm -f "$BACKEND_PID_FILE"
            fi
        else
            if lsof -ti:7001 >/dev/null 2>&1; then
                echo "⚠️  Port 7001 occupied (unknown process)"
            else
                echo "❌ Not running"
            fi
        fi
        
        echo "Frontend:"
        if [ -f "$FRONTEND_PID_FILE" ]; then
            FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
            if kill -0 "$FRONTEND_PID" 2>/dev/null; then
                FRONTEND_URL=$(grep -oE "http://localhost:[0-9]+" logs/frontend.log 2>/dev/null | head -1 || echo "http://localhost:5173")
                echo "✅ Running (PID: $FRONTEND_PID) - $FRONTEND_URL"
            else
                echo "❌ PID file exists but process not running"
                rm -f "$FRONTEND_PID_FILE"
            fi
        else
            if lsof -ti:5173 >/dev/null 2>&1 || lsof -ti:5174 >/dev/null 2>&1; then
                echo "⚠️  Frontend ports occupied (unknown process)"
            else
                echo "❌ Not running"
            fi
        fi
        
        echo "Claude CLI:"
        if claude auth status >/dev/null 2>&1; then
            echo "✅ Authenticated"
        else
            echo "❌ Not authenticated - run: claude auth login"
        fi
        
        echo "Environment:"
        if [ -f "backend/.env" ]; then
            echo "✅ Backend .env exists"
            if grep -q "NUM_VARIANTS" backend/.env; then
                NUM_VARIANTS=$(grep "NUM_VARIANTS" backend/.env | cut -d'=' -f2)
                echo "   NUM_VARIANTS=$NUM_VARIANTS"
            fi
        else
            echo "⚠️  No backend .env file"
        fi
        ;;
    "logs")
        echo "📊 Showing recent logs..."
        echo "=== Backend logs ==="
        tail -20 backend.log 2>/dev/null || echo "No backend logs found"
        echo "=== Frontend logs ==="
        tail -20 frontend.log 2>/dev/null || echo "No frontend logs found"
        ;;
    *)
        echo "📖 Screenshot to Code - Development Helper"
        echo ""
        echo "Usage: ./dev.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start      Start both servers (default)"
        echo "  stop       Stop both servers"  
        echo "  restart    Restart both servers"
        echo "  backend    Start backend only"
        echo "  frontend   Start frontend only"
        echo "  install    Install all dependencies"
        echo "  status     Check server status"
        echo "  logs       Show recent logs"
        echo ""
        echo "Examples:"
        echo "  ./dev.sh           # Start both servers"
        echo "  ./dev.sh stop      # Stop servers"
        echo "  ./dev.sh status    # Check status"
        ;;
esac