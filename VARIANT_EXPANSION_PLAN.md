# Plan: Support Generic Number of Variants (Default: 3)

## Current System Analysis

**Current State:**

- Fixed `NUM_VARIANTS = 2` in config
- Hard-coded 2-variant grid layout (`grid-cols-2`)
- Fixed 2-variant model selection logic
- Hard-coded 2-variant initialization in frontend

## Implementation Plan

### Phase 1: Backend Configuration & Model Selection

**1.1 Generic Variant Count Support**

- Change `NUM_VARIANTS = 3` in backend config (default)
- Design system to work with any NUM_VARIANTS value (2, 3, 4, 5, etc.)
- Frontend learns variant count from backend response

**1.2 Dynamic Model Selection Strategy**

```python
# Generic model selection that scales with NUM_VARIANTS:
def get_variant_models(generation_type, num_variants, openai_api_key, anthropic_api_key):
    if anthropic_api_key:
        # Claude models (preferred)
        claude_models = [
            Llm.CLAUDE_3_7_SONNET_2025_02_19,     # Primary
            Llm.CLAUDE_3_5_SONNET_2024_10_22,     # Alternative 1
            Llm.CLAUDE_3_5_SONNET_2024_06_20,     # Alternative 2
            Llm.CLAUDE_4_SONNET_2025_05_14,       # Alternative 3
            Llm.CLAUDE_4_OPUS_2025_05_14,         # Alternative 4
        ]

        if generation_type == "create":
            # Reorder for creation (3.7 first)
            preferred_order = [0, 1, 2, 3, 4]  # Keep same order
        else:
            # Reorder for updates (3.5 first)
            preferred_order = [2, 1, 0, 3, 4]  # 3.5 first, then others

        selected_models = [claude_models[i] for i in preferred_order[:num_variants]]

        # If we need more models than available, cycle through them
        while len(selected_models) < num_variants:
            selected_models.extend(claude_models)

        return selected_models[:num_variants]

    elif openai_api_key:
        # OpenAI models fallback
        openai_models = [
            Llm.GPT_4O_2024_11_20,
            Llm.GPT_4_1_NANO_2025_04_14,
            Llm.GPT_4_1_MINI_2025_04_14,
            Llm.O1_2024_12_17,
            Llm.GPT_4_1_2025_04_14,
        ]

        # Cycle through models if we need more than available
        selected_models = []
        for i in range(num_variants):
            selected_models.append(openai_models[i % len(openai_models)])

        return selected_models
```

### Phase 2: Frontend UI Adaptation

**2.1 Fully Dynamic Grid Layout**

```tsx
// Generic grid layout that works for any number of variants:
const getGridClass = (variantCount: number) => {
  if (variantCount <= 2) {
    return "grid grid-cols-2 gap-2";
  } else if (variantCount === 3) {
    return "grid grid-cols-3 gap-2";
  } else if (variantCount === 4) {
    return "grid grid-cols-2 gap-2"; // 2x2 grid
  } else if (variantCount <= 6) {
    return "grid grid-cols-3 gap-2"; // 3x2 grid
  } else {
    return "grid grid-cols-4 gap-2"; // 4x? grid for larger counts
  }
};

// Alternative: responsive grid that adapts to content
const getResponsiveGridClass = (variantCount: number) => {
  return `grid gap-2 grid-cols-${Math.min(variantCount, 4)}`;
};
```

**2.2 Backend-Driven Variant Count Discovery**

```tsx
// Frontend automatically discovers variant count from backend:
const variantCount = commit.variants.length; // Dynamic discovery
const gridClass = getGridClass(variantCount);

// All variant-related UI scales automatically:
// - Grid layout
// - Keyboard shortcuts (1-9 supported)
// - Status indicators
// - Error handling
```

**2.3 Generic Commit Initialization**

```tsx
// Frontend creates commits based on backend-provided variant count:
// Backend includes NUM_VARIANTS in response or sends initial variants array
const baseCommitObject = {
  variants: Array(variantCount)
    .fill(null)
    .map(() => ({ code: "" })),
};
```

### Phase 3: Enhanced UX for Any Number of Variants

**3.1 Scalable Keyboard Shortcuts**

- Support keys 1-9 for variant switching (covers up to 9 variants)
- Visual indicators show appropriate numbers (1, 2, 3, ..., N)
- Keyboard shortcuts work regardless of variant count

**3.2 Responsive Grid Layouts**

- 2 variants: 2-column layout
- 3 variants: 3-column layout
- 4 variants: 2x2 grid
- 5-6 variants: 3x2 grid
- 7+ variants: 4-column grid with wrapping

**3.3 Scalable Performance**

- Design handles any reasonable number of variants (2-10)
- Memory management scales with variant count
- Error handling works for N variants
- WebSocket message handling scales automatically

## Implementation Priority

### High Priority (MVP for generic variant support)

1. ✅ Backend: Change NUM_VARIANTS to 3 (default)
2. ✅ Backend: Generic model selection that scales with NUM_VARIANTS
3. ✅ Frontend: Fully dynamic grid layout for any variant count
4. ✅ Frontend: Backend-driven variant count discovery
5. ✅ Frontend: Generic commit initialization

### Medium Priority (UX improvements)

6. ✅ Scalable keyboard shortcuts (1-9)
7. ✅ Responsive grid layouts for different variant counts
8. ✅ Performance testing with variable variant counts

## Technical Considerations

**Memory Usage:**

- Memory usage scales linearly with variant count (N variants = N×base usage)
- Monitor memory consumption with variable parallel generations
- Current streaming architecture should handle this well

**API Costs:**

- API costs scale linearly with variant count (N variants = N×base cost)
- Using Claude models keeps costs predictable across variant counts
- Easy to control costs by adjusting NUM_VARIANTS constant

**Performance:**

- Parallel generation should handle any reasonable variant count (2-10)
- Monitor WebSocket message throughput with higher variant counts
- Existing error handling scales naturally

**Error Handling:**

- More variants = higher chance of partial failures
- Current error handling system designed to handle N variants
- Test graceful degradation with various variant counts

## Success Metrics

1. **Flexibility:** System works seamlessly with NUM_VARIANTS = 2, 3, 4, 5, etc.
2. **User Experience:** UI adapts beautifully to any variant count
3. **Performance:** Generation time scales reasonably with variant count
4. **System Stability:** Error rates remain stable across variant counts

## Implementation Checklist

### Backend Changes

- [ ] Change `NUM_VARIANTS = 3` in config.py (default)
- [ ] Create generic `get_variant_models()` function
- [ ] Update `ModelSelectionStage` to use generic model selection
- [ ] Ensure `StatusBroadcastMiddleware` uses NUM_VARIANTS dynamically
- [ ] Test with NUM_VARIANTS = 2, 3, 4, 5

### Frontend Changes

- [ ] Update App.tsx to create variants dynamically from backend count
- [ ] Modify Variants.tsx for fully dynamic grid layout
- [ ] Ensure keyboard shortcuts support 1-9 keys
- [ ] Add responsive grid layouts for different variant counts
- [ ] Test variant switching with various counts (2, 3, 4, 5)

### Testing & QA

- [ ] Test NUM_VARIANTS = 2 (backward compatibility)
- [ ] Test NUM_VARIANTS = 3 (new default)
- [ ] Test NUM_VARIANTS = 4 (2x2 grid)
- [ ] Test NUM_VARIANTS = 5 (stress test)
- [ ] Verify UI layouts for all variant counts
- [ ] Performance testing with various variant counts

## Notes

- Design for maximum flexibility: changing NUM_VARIANTS should "just work"
- Frontend automatically adapts to any backend variant count
- No user settings needed - backend NUM_VARIANTS constant controls everything
- Focus on making grid layouts look good for common variant counts (2, 3, 4)
- System should gracefully handle edge cases (1 variant, 10+ variants)

## Abi's Notes

- [DONE] Let's set up a number of models that we want. And it will just cycle through those and repeat them. If models are [A, B], then if num = 5, it will be [A, B, A, B, A] and so on.

1. [DONE] With 3 options, it looks too squished on the front-end.
2. We need to change hotkey to Option + 1, 2, 3, etc because when focused on textbox, the 1, 2, 3 keys are captured by the textbox.
