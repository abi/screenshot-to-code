# Variant System Transformation Plan

## Current System Analysis

### How Variants Currently Work

1. **Blocking Generation**: When a user creates or updates code, the system generates NUM_VARIANTS (2) variants in parallel using different AI models
2. **All-or-Nothing**: The WebSocket connection remains open until ALL variants complete generation
3. **No Interactivity During Generation**: Users must wait for all variants to finish before they can:
   - Select a variant
   - Make updates
   - Start a new generation

### Key Components

#### Backend (`backend/routes/generate_code.py`)
- Lines 286-348: Creates parallel tasks for all variants
- Line 350: Uses `asyncio.gather()` to wait for ALL tasks to complete
- Line 447: Only closes WebSocket after all variants are done
- Sends messages with `variantIndex` to route to correct variant

#### Frontend
- `frontend/src/generateCode.ts`: WebSocket client that only triggers `onComplete` when connection closes
- `frontend/src/App.tsx`: Sets `AppState.CODING` during generation, blocking UI
- `frontend/src/components/variants/Variants.tsx`: Only shows variants when generation is complete

### Current Flow
```
User Request → Generate All Variants → Wait for All → Close WS → Show Results → Allow Interaction
```

## Proposed Non-Blocking System

### New Flow
```
User Request → Start Generation → Show First Complete → User Can Interact → Cancel Others if Needed
```

### Key Changes Needed

#### 1. Backend Changes

**WebSocket Protocol Enhancement**
- Add new message type: `"variantComplete"` to signal individual variant completion
- Keep WebSocket open after first variant completes
- Add ability to cancel specific variants mid-generation
- Track variant states: `pending`, `generating`, `complete`, `failed`, `cancelled`

**Generation Logic**
```python
# Instead of:
completions = await asyncio.gather(*tasks, return_exceptions=True)

# Use:
async def process_variants():
    for index, task in enumerate(tasks):
        try:
            completion = await task
            await send_message("variantComplete", index)
            # Allow frontend to interact immediately
        except Exception as e:
            await send_message("variantFailed", index)
```

#### 2. Frontend Changes

**State Management**
- Add variant-level state tracking in `project-store.ts`:
  ```typescript
  interface VariantState {
    code: string;
    status: 'pending' | 'generating' | 'complete' | 'failed' | 'cancelled';
    generationTime?: number;
  }
  ```

**UI Updates**
- Show variant options as soon as first one completes
- Display loading states for incomplete variants
- Enable "Update" button when at least one variant is ready
- Add visual indicators for variant states

**WebSocket Client**
- Handle new `variantComplete` message type
- Don't wait for WebSocket close to enable interactions
- Track which variants are still generating

#### 3. User Experience Improvements

**Progressive Loading**
- Show first variant immediately when ready
- Display skeleton/loading state for pending variants
- Allow switching between completed variants while others generate

**Update Flow**
- When user starts update with incomplete variants:
  - Cancel remaining variant generations
  - Start new generation with 2 variants
  - Clear previous incomplete variants

**Visual Feedback**
- Loading spinner on generating variants
- Success checkmark on completed variants
- Subtle animation when variant completes
- Time elapsed indicator

### Implementation Steps

1. **Phase 1: Backend Protocol** (2-3 days)
   - Modify WebSocket message protocol
   - Implement per-variant completion tracking
   - Add cancellation mechanism

2. **Phase 2: Frontend State** (2-3 days)
   - Update Zustand store for variant states
   - Modify WebSocket client handling
   - Update commit structure

3. **Phase 3: UI Components** (2-3 days)
   - Update Variants.tsx for progressive display
   - Add loading states and animations
   - Update Sidebar.tsx for immediate interactions

4. **Phase 4: Testing & Polish** (2 days)
   - Handle edge cases (all variants fail, etc.)
   - Performance optimization
   - User testing

### Benefits

1. **Faster Time to First Interaction**: Users can work with the first variant immediately
2. **Better User Experience**: No more waiting for slow models when fast ones are ready
3. **Increased Efficiency**: Users can evaluate and iterate faster
4. **Flexibility**: Users can cancel unwanted generations mid-flight

### Risks & Mitigation

1. **Complexity**: More state to manage
   - Mitigation: Careful state design, comprehensive testing

2. **Race Conditions**: User updates while variants generating
   - Mitigation: Clear cancellation logic, queue management

3. **UI Confusion**: Users might not understand partial results
   - Mitigation: Clear visual indicators, tooltips

### Success Metrics

- Time to first interaction reduced by ~50%
- User satisfaction with generation speed
- Reduced abandonment during generation
- Increased number of iterations per session
