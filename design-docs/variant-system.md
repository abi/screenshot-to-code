# Variant System

## Overview

The variant system generates multiple code options in parallel, allowing users to compare different AI-generated implementations. The system defaults to 3 variants and scales automatically by changing `NUM_VARIANTS` in config.

## Configuration

**Key Setting:** `NUM_VARIANTS = 3` in `backend/config.py`

Changing this value automatically scales the entire system to support any number of variants.

## Model Selection

Models cycle based on available API keys:

```python
# Both API keys present
models = [claude_model, Llm.GPT_4_1_NANO_2025_04_14]

# Claude only  
models = [claude_model, Llm.CLAUDE_3_5_SONNET_2024_06_20]

# OpenAI only
models = [Llm.GPT_4O_2024_11_20]
```

**Cycling:** If models = [A, B] and NUM_VARIANTS = 5, result is [A, B, A, B, A]

**Generation Type:**
- **Create**: Primary model is Claude 3.7 Sonnet
- **Update**: Primary model is Claude 3.5 Sonnet

## Frontend

### Grid Layouts
- **2 variants**: 2-column 
- **3 variants**: 2-column (third wraps below - prevents squishing)
- **4 variants**: 2x2 grid  
- **5-6 variants**: 3-column 
- **7+ variants**: 4-column

### Keyboard Shortcuts
- **Option/Alt + 1, 2, 3...**: Switch variants
- Works globally, even in text fields
- Uses `event.code` for cross-platform compatibility
- Visual indicators show ⌥1, ⌥2, ⌥3

## Architecture

### Backend
- `StatusBroadcastMiddleware` sends `variantCount` to frontend
- `ModelSelectionStage` cycles through available models
- Pipeline generates variants in parallel via WebSocket

### Frontend  
- Learns variant count from backend dynamically
- `resizeVariants()` adapts UI to backend count
- Error handling per variant with status display

## WebSocket Messages

```typescript
"variantCount" | "chunk" | "status" | "setCode" | "variantComplete" | "variantError"
```

## Implementation Notes

✅ **Scalable**: Change `NUM_VARIANTS` and everything adapts  
✅ **Cross-platform**: Keyboard shortcuts work Mac/Windows  
✅ **Responsive**: Grid layouts adapt to count  
✅ **Simple**: Model cycling handles any variant count  

## Key Files

- `backend/config.py` - NUM_VARIANTS setting
- `backend/routes/generate_code.py` - Model selection pipeline  
- `frontend/src/components/variants/Variants.tsx` - UI and shortcuts
- `frontend/src/store/project-store.ts` - State management
