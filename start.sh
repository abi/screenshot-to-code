#!/bin/bash

# Screenshot to Code - Start Script
# This script starts both backend and frontend servers as separate processes

set -e

echo "🚀 Starting Screenshot to Code servers..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PID file locations
PID_DIR="./pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# Create PID directory
mkdir -p "$PID_DIR"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    
    # Kill backend if running
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
            kill "$BACKEND_PID" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Kill frontend if running
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
            kill "$FRONTEND_PID" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Fallback: kill by process name
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo -e "${GREEN}✅ All servers stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Check if Claude CLI is authenticated
echo -e "${BLUE}Checking Claude CLI authentication...${NC}"
if ! claude auth status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Claude CLI not authenticated. Run: claude auth login${NC}"
    echo -e "${BLUE}Continuing anyway...${NC}"
fi

# Function to start backend
start_backend() {
    echo -e "${BLUE}Starting backend server...${NC}"
    
    # Setup backend environment
    cd backend
    
    # Check if .env exists, create with default if not
    if [ ! -f .env ]; then
        cat > .env << EOF
NUM_VARIANTS=1
# Add your API keys here if needed:
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# GEMINI_API_KEY=your_gemini_key
EOF
        echo -e "${GREEN}Created default .env file${NC}"
    fi
    
    # Check dependencies
    if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        pip install fastapi uvicorn websockets openai python-dotenv beautifulsoup4 httpx anthropic moviepy==1.0.3 google-genai
    fi
    
    # Start backend in background
    python -m uvicorn main:app --reload --port 7001 > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "../$BACKEND_PID_FILE"
    
    cd ..
    
    # Wait a moment and check if it started successfully
    sleep 2
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${GREEN}✅ Backend started successfully on http://127.0.0.1:7001${NC}"
        echo -e "${BLUE}   PID: $BACKEND_PID | Logs: tail -f logs/backend.log${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend failed to start. Check logs/backend.log${NC}"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}Starting frontend server...${NC}"
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        if command -v yarn > /dev/null; then
            yarn install
        else
            npm install
        fi
    fi
    
    # Start frontend in background
    if command -v yarn > /dev/null; then
        yarn dev > ../logs/frontend.log 2>&1 &
    else
        npm run dev > ../logs/frontend.log 2>&1 &
    fi
    
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "../$FRONTEND_PID_FILE"
    
    cd ..
    
    # Wait a moment and check if it started successfully
    sleep 3
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        # Try to detect the actual port from logs
        sleep 2
        FRONTEND_URL=$(grep -oE "http://localhost:[0-9]+" logs/frontend.log | head -1 || echo "http://localhost:5173")
        echo -e "${GREEN}✅ Frontend started successfully on $FRONTEND_URL${NC}"
        echo -e "${BLUE}   PID: $FRONTEND_PID | Logs: tail -f logs/frontend.log${NC}"
        return 0
    else
        echo -e "${RED}❌ Frontend failed to start. Check logs/frontend.log${NC}"
        return 1
    fi
}

# Function to check if ports are in use
check_ports() {
    local backend_port_free=true
    local frontend_port_free=true
    
    if lsof -Pi :7001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        backend_port_free=false
        echo -e "${YELLOW}⚠️  Port 7001 is already in use${NC}"
    fi
    
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        frontend_port_free=false
        echo -e "${YELLOW}⚠️  Port 5173 is already in use (frontend will find next available)${NC}"
    fi
    
    if [ "$backend_port_free" = false ]; then
        echo -e "${RED}Backend port 7001 is occupied. Stopping existing servers...${NC}"
        pkill -f "uvicorn main:app" 2>/dev/null || true
        sleep 2
    fi
}

# Create logs directory
mkdir -p logs

# Stop any existing servers
echo -e "${BLUE}Checking for existing servers...${NC}"
check_ports

# Clean up old PID files
rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE" 2>/dev/null || true

# Start servers
echo -e "${BLUE}🚀 Starting servers...${NC}"
echo ""

if start_backend; then
    sleep 2
    if start_frontend; then
        echo ""
        echo -e "${GREEN}🎉 All servers started successfully!${NC}"
        echo ""
        echo -e "${BLUE}📱 Frontend:${NC} Check logs/frontend.log for actual URL"  
        echo -e "${BLUE}🔧 Backend:${NC}  http://127.0.0.1:7001"
        echo ""
        echo -e "${BLUE}💡 Useful Commands:${NC}"
        echo "• ./dev.sh status     - Check server status"
        echo "• ./stop.sh          - Stop all servers"
        echo "• tail -f logs/backend.log   - View backend logs"
        echo "• tail -f logs/frontend.log  - View frontend logs"
        echo ""
        echo -e "${YELLOW}⌨️  Press Ctrl+C to stop all servers${NC}"
        echo ""
        
        # Wait for user interrupt or process death
        while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
            sleep 5
        done
        
        echo -e "${RED}One or more servers stopped unexpectedly${NC}"
        
    else
        echo -e "${RED}❌ Failed to start frontend${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to start backend${NC}"
    exit 1
fi