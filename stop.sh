#!/bin/bash

# Screenshot to Code - Stop Script
# This script stops both backend and frontend servers

echo "🛑 Stopping Screenshot to Code servers..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PID file locations
PID_DIR="./pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

stopped_any=false

# Stop backend using PID file
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    echo -e "${BLUE}Stopping backend server (PID: $BACKEND_PID)...${NC}"
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        if kill "$BACKEND_PID" 2>/dev/null; then
            echo -e "${GREEN}✅ Backend stopped${NC}"
            stopped_any=true
        else
            echo -e "${YELLOW}⚠️  Failed to stop backend gracefully${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Backend process not running${NC}"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo -e "${BLUE}Stopping backend server...${NC}"
    if pkill -f "uvicorn main:app" 2>/dev/null; then
        echo -e "${GREEN}✅ Backend stopped${NC}"
        stopped_any=true
    else
        echo -e "${YELLOW}ℹ️  No backend server running${NC}"
    fi
fi

# Stop frontend using PID file
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    echo -e "${BLUE}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        if kill "$FRONTEND_PID" 2>/dev/null; then
            echo -e "${GREEN}✅ Frontend stopped${NC}"
            stopped_any=true
        else
            echo -e "${YELLOW}⚠️  Failed to stop frontend gracefully${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️  Frontend process not running${NC}"
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo -e "${BLUE}Stopping frontend server...${NC}"
    if pkill -f "vite" 2>/dev/null; then
        echo -e "${GREEN}✅ Frontend stopped${NC}"
        stopped_any=true
    else
        echo -e "${YELLOW}ℹ️  No frontend server running${NC}"
    fi
fi

# Fallback: kill any remaining processes
echo -e "${BLUE}Cleaning up any remaining processes...${NC}"
if pkill -f "uvicorn main:app" 2>/dev/null || pkill -f "vite" 2>/dev/null; then
    echo -e "${GREEN}✅ Cleaned up remaining processes${NC}"
    stopped_any=true
fi

# Wait a moment for graceful shutdown
if [ "$stopped_any" = true ]; then
    sleep 2
fi

# Clean up PID directory if empty
if [ -d "$PID_DIR" ] && [ -z "$(ls -A $PID_DIR)" ]; then
    rmdir "$PID_DIR" 2>/dev/null || true
fi

echo -e "${GREEN}🎯 All servers stopped successfully!${NC}"

# Show status
echo -e "${BLUE}Port status:${NC}"
if lsof -Pi :7001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 7001 still occupied${NC}"
else
    echo -e "${GREEN}✅ Port 7001 free${NC}"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend ports still occupied${NC}"
else
    echo -e "${GREEN}✅ Frontend ports free${NC}"
fi