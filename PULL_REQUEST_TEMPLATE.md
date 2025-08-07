# Claude Code Pro CLI Integration

## Summary

This PR adds comprehensive Claude Code Pro CLI integration to screenshot-to-code, enabling users to generate code from screenshots using their Claude Code Pro subscription without requiring separate API keys.

### Key Features
- ✅ **Full Image Analysis**: Claude CLI integration with screenshot processing
- ✅ **Zero API Keys**: Works entirely with Claude Code Pro subscription  
- ✅ **Smart Fallback**: Automatically falls back to API if available
- ✅ **Configurable Variants**: Control number of variants via `NUM_VARIANTS` env var
- ✅ **Enhanced Scripts**: Comprehensive development scripts with process management

### Technical Implementation

#### New Claude CLI Wrapper (`backend/models/claude_cli.py`)
- Base64 image extraction and temp file handling
- Streaming response support with character-by-character output
- Proper cleanup of temporary image files
- Support for both regular and video generation modes

#### Modified Route Handler (`backend/routes/generate_code.py`)  
- Uses CLI by default for all Claude models
- Maintains backward compatibility with API keys
- Enhanced error handling and process management
- Smart model selection based on available resources

#### Enhanced Configuration (`backend/config.py`)
- `NUM_VARIANTS` environment variable support
- Configurable model selection based on available resources
- Default NUM_VARIANTS=1 for simplified UX when using CLI only

### Development Experience Improvements
- **Automated Scripts**: `start.sh`, `stop.sh`, `restart.sh`, `dev.sh`, `start-separate.sh`
- **Process Management**: PID tracking and graceful shutdown
- **Enhanced Logging**: Separate log files for backend/frontend with timestamps
- **Status Monitoring**: Real-time server status checking
- **Dependency Management**: Auto-install missing dependencies

### Files Changed
```
backend/models/claude_cli.py         # New Claude CLI integration
backend/routes/generate_code.py      # Modified to use CLI by default
backend/config.py                    # Added NUM_VARIANTS configuration
README.md                           # Updated with CLI setup instructions
.gitignore                          # Enhanced for better project management
start.sh                            # Comprehensive server startup script
stop.sh                             # Graceful server shutdown script
restart.sh                          # Combined restart functionality
dev.sh                              # Multi-purpose development helper
start-separate.sh                   # Alternative startup in separate terminals
```

### Benefits
- 🚀 **Immediate Value**: Users with Claude Code Pro can start using immediately
- 💰 **Cost Savings**: No additional API costs for Pro subscribers  
- 🛠️ **Better DX**: Enhanced development scripts and process management
- 🔄 **Backward Compatible**: Existing API key setups continue to work
- 🖼️ **Full Feature Parity**: Image analysis works through CLI integration

### Setup Instructions

#### For Claude Code Pro Users (No API Keys Needed)
```bash
# Authenticate with Claude Code Pro
claude auth login

# Clone and setup
git clone https://github.com/abi/screenshot-to-code.git
cd screenshot-to-code

# Start servers (creates NUM_VARIANTS=1 automatically)
./start.sh
```

#### For API Key Users (Existing Workflow)
```bash
# Setup with API keys as before
echo "OPENAI_API_KEY=sk-your-key" > backend/.env
echo "ANTHROPIC_API_KEY=your-key" >> backend/.env
./start.sh
```

### Test Plan
- [x] Test screenshot upload and code generation with Claude Code Pro
- [x] Verify image analysis works through CLI integration  
- [x] Test server startup/shutdown scripts with PID management
- [x] Validate environment variable configuration (NUM_VARIANTS)
- [x] Test graceful fallback to API when available
- [x] Verify backward compatibility with existing API key setups
- [x] Test all development helper scripts (dev.sh, status checking)

### Breaking Changes
None - this is fully backward compatible.

### Migration Notes
Existing users can continue using API keys as before. New users with Claude Code Pro can skip API key setup entirely.

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>