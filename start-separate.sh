#!/bin/bash

# Screenshot to Code - Start in Separate Terminals
# This script starts servers in separate terminal windows

echo "🚀 Starting Screenshot to Code in separate terminals..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Stop existing servers
echo -e "${BLUE}Stopping any existing servers...${NC}"
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Create .env if needed
cd backend
if [ ! -f .env ]; then
    echo "NUM_VARIANTS=1" > .env
    echo "# Add your API keys here if needed:" >> .env
    echo "# OPENAI_API_KEY=your_openai_key" >> .env
    echo "# ANTHROPIC_API_KEY=your_anthropic_key" >> .env
    echo "Created default .env file"
fi
cd ..

# Check if we're on macOS to use 'open' command
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "${BLUE}Opening backend in new Terminal window...${NC}"
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/backend\" && python -m uvicorn main:app --reload --port 7001"'
    
    sleep 3
    
    echo -e "${BLUE}Opening frontend in new Terminal window...${NC}"
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/frontend\" && yarn dev"'
    
else
    # Linux/Other
    echo -e "${BLUE}Starting backend in new terminal...${NC}"
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd)/backend && python -m uvicorn main:app --reload --port 7001; exec bash"
        sleep 3
        gnome-terminal -- bash -c "cd $(pwd)/frontend && yarn dev; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd)/backend && python -m uvicorn main:app --reload --port 7001" &
        sleep 3
        xterm -e "cd $(pwd)/frontend && yarn dev" &
    else
        echo -e "${RED}No supported terminal emulator found. Please run manually:${NC}"
        echo "Terminal 1: cd backend && python -m uvicorn main:app --reload --port 7001"
        echo "Terminal 2: cd frontend && yarn dev"
        exit 1
    fi
fi

sleep 3

echo ""
echo -e "${GREEN}🎉 Servers should be starting in separate terminals!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:5173 (or next available port)"
echo -e "${BLUE}🔧 Backend:${NC}  http://127.0.0.1:7001"
echo ""
echo -e "${BLUE}🛑 To stop servers:${NC} ./stop.sh or close the terminal windows"