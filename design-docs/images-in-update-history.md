# Images in Update History - Backend Implementation Plan

## Overview

This document outlines the backend changes needed to support multiple images in update history items. Currently, the backend only processes the `text` field from history items and ignores the `images` field that already exists in the `PromptContent` structure.

## Current State Analysis

### ✅ What Already Works
- History items have `PromptContent` structure with both `text` and `images` fields
- Backend receives full history items with images field (but ignores it)
- Image handling infrastructure exists for initial prompts

### ❌ What's Missing
- Backend only uses `item["text"]` and ignores `item["images"]` in history processing
- No logic to create multipart content for user messages with images

## Required Changes

### 1. Core Function Update: `create_prompt()`

**File**: `backend/prompts/__init__.py`

#### 1.1 Update History Processing for Regular Updates (Lines 64-70)

**Current Code:**
```python
if params["generationType"] == "update":
    # Transform the history tree into message format
    for index, item in enumerate(params["history"]):
        role = "assistant" if index % 2 == 0 else "user"
        message: ChatCompletionMessageParam = {
            "role": role,
            "content": item["text"],
        }
        prompt_messages.append(message)
```

**New Code:**
```python
if params["generationType"] == "update":
    # Transform the history tree into message format
    for index, item in enumerate(params["history"]):
        role = "assistant" if index % 2 == 0 else "user"
        
        # Check if this is a user message with images
        if role == "user" and item.get("images") and len(item["images"]) > 0:
            # Create multipart content for user messages with images
            user_content: list[ChatCompletionContentPartParam] = []
            
            # Add all images first
            for image_url in item["images"]:
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "high"},
                })
            
            # Add text content
            user_content.append({
                "type": "text",
                "text": item["text"],
            })
            
            message: ChatCompletionMessageParam = {
                "role": role,
                "content": user_content,
            }
        else:
            # Regular text-only message (assistant messages or user messages without images)
            message: ChatCompletionMessageParam = {
                "role": role,
                "content": item["text"],
            }
        
        prompt_messages.append(message)
```

#### 1.2 Update Imported Code History Processing (Lines 32-38)

**Current Code:**
```python
for index, item in enumerate(params["history"][1:]):
    role = "user" if index % 2 == 0 else "assistant"
    message: ChatCompletionMessageParam = {
        "role": role,
        "content": item["text"],
    }
    prompt_messages.append(message)
```

**New Code:**
```python
for index, item in enumerate(params["history"][1:]):
    role = "user" if index % 2 == 0 else "assistant"
    
    # Apply same image handling logic for imported code history
    if role == "user" and item.get("images") and len(item["images"]) > 0:
        user_content: list[ChatCompletionContentPartParam] = []
        
        for image_url in item["images"]:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": image_url, "detail": "high"},
            })
        
        user_content.append({
            "type": "text",
            "text": item["text"],
        })
        
        message: ChatCompletionMessageParam = {
            "role": role,
            "content": user_content,
        }
    else:
        message: ChatCompletionMessageParam = {
            "role": role,
            "content": item["text"],
        }
    
    prompt_messages.append(message)
```

### 2. Extract Common Logic into Helper Function

**Add New Function** (around line 80):

```python
def create_message_from_history_item(
    item: dict[str, Any], role: str
) -> ChatCompletionMessageParam:
    """
    Create a ChatCompletionMessageParam from a history item.
    Handles both text-only and text+images content.
    """
    # Check if this is a user message with images
    if role == "user" and item.get("images") and len(item["images"]) > 0:
        # Create multipart content for user messages with images
        user_content: list[ChatCompletionContentPartParam] = []
        
        # Add all images first
        for image_url in item["images"]:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": image_url, "detail": "high"},
            })
        
        # Add text content
        user_content.append({
            "type": "text",
            "text": item["text"],
        })
        
        return {
            "role": role,
            "content": user_content,
        }
    else:
        # Regular text-only message
        return {
            "role": role,
            "content": item["text"],
        }
```

**Then Update Both History Processing Sections:**

```python
# For regular updates:
message = create_message_from_history_item(item, role)
prompt_messages.append(message)

# For imported code:
message = create_message_from_history_item(item, role)
prompt_messages.append(message)
```

### 3. Testing Requirements

**Add to `tests/test_prompts.py`:**

#### 3.1 Test Update with Single Image
```python
@pytest.mark.asyncio
async def test_image_mode_update_with_single_image_in_history(self) -> None:
    """Test update with user message containing a single image."""
    params: Dict[str, Any] = {
        "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
        "generationType": "update",
        "history": [
            {"text": "<html>Initial code</html>", "images": []},
            {"text": "Add a button", "images": ["data:image/png;base64,reference_image"]},
            {"text": "<html>Code with button</html>", "images": []}
        ]
    }
    # Test that user message has multipart content with image + text
```

#### 3.2 Test Update with Multiple Images
```python
@pytest.mark.asyncio
async def test_image_mode_update_with_multiple_images_in_history(self) -> None:
    """Test update with user message containing multiple images."""
    params: Dict[str, Any] = {
        "prompt": {"text": "", "images": [self.TEST_IMAGE_URL]},
        "generationType": "update", 
        "history": [
            {"text": "<html>Initial code</html>", "images": []},
            {"text": "Style like these examples", "images": [
                "data:image/png;base64,example1",
                "data:image/png;base64,example2"
            ]},
            {"text": "<html>Styled code</html>", "images": []}
        ]
    }
    # Test that user message has multipart content with 2 images + text
```

#### 3.3 Test Backward Compatibility
```python
@pytest.mark.asyncio
async def test_update_with_empty_images_arrays(self) -> None:
    """Test that empty images arrays don't break existing functionality."""
    # Test with explicit empty arrays and missing images fields
```

#### 3.4 Test Imported Code with Images
```python
@pytest.mark.asyncio
async def test_imported_code_update_with_images_in_history(self) -> None:
    """Test imported code flow with images in update history."""
    params: Dict[str, Any] = {
        "isImportedFromCode": True,
        "generationType": "update",
        "history": [
            {"text": "<html>Original imported code</html>", "images": []},
            {"text": "Update with this reference", "images": ["data:image/png;base64,ref_image"]},
            {"text": "<html>Updated code</html>", "images": []}
        ]
    }
    # Test that imported code flow also handles images correctly
```

## Implementation Summary

### Files to Modify
1. `backend/prompts/__init__.py` - Main logic changes
2. `backend/tests/test_prompts.py` - New test cases

### Key Functions Updated
1. `create_prompt()` - History processing logic for both regular and imported code updates
2. **New**: `create_message_from_history_item()` - Helper function for DRY code
3. **Tests**: 4 new test cases for comprehensive image support

### Backward Compatibility
- ✅ Existing history items without images continue to work
- ✅ Empty images arrays are handled gracefully  
- ✅ Assistant messages (code) remain text-only
- ✅ No breaking changes to existing API

### Key Design Decisions

1. **Only User Messages Support Images**: Assistant messages (generated code) remain text-only, which makes sense since they contain code, not user instructions.

2. **Images First, Then Text**: In multipart content, images are added before text to maintain consistency with the initial prompt structure.

3. **DRY Principle**: Common logic is extracted into a helper function to avoid code duplication between regular updates and imported code updates.

4. **Graceful Degradation**: The system handles missing `images` fields and empty arrays without breaking.

### Estimated Implementation Time
- **Core changes**: 2-3 hours
- **Tests**: 1-2 hours  
- **Total**: 3-5 hours

This implementation will enable the frontend to send images with update instructions, allowing for more precise and visually-guided code modifications.
