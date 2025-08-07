#!/bin/bash

# Screenshot to Code - Restart Script
# This script restarts both backend and frontend servers

echo "🔄 Restarting Screenshot to Code servers..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Stopping existing servers...${NC}"
./stop.sh

echo ""
echo -e "${BLUE}Step 2: Starting servers...${NC}"
./start.sh