# Design Document: Unified Prompt Structure for Image Support in Updates

## Overview

This document outlines the design for implementing a unified prompt structure that supports images in both initial creation and follow-up edits. The goal is to create a consistent, flexible data structure that treats all prompts equally, enabling multi-modal inputs across the entire application.

## Motivation

Currently, the application supports image uploads only during initial creation. Follow-up edits are limited to text-only instructions. This limitation prevents users from:
- Showing visual examples of desired changes
- Uploading new assets (logos, images) during updates
- Providing visual context for style or layout modifications

## Goals

1. **Unified Structure**: Create a single data structure for all prompts (create and update)
2. **Multi-modal Support**: Enable images in update prompts, not just creation
3. **Backwards Compatibility**: Ensure existing functionality continues to work
4. **Future Extensibility**: Design for future media types (audio, video, annotations)

## Design

### Core Data Structure

#### Frontend (TypeScript)

```typescript
// New unified prompt structure
export interface PromptContent {
  text: string;
  images: string[]; // Array of data URLs
}

// Updated code generation parameters
export interface CodeGenerationParams {
  generationType: "create" | "update";
  inputMode: "image" | "video" | "text";
  prompt: PromptContent;           // Current prompt
  history?: PromptContent[];       // Conversation history
  isImportedFromCode?: boolean;
  // ... other existing fields
}

// Updated commit types
export interface AiCreateCommit {
  type: "ai_create";
  parentHash: null;
  inputs: PromptContent;
  variants: Variant[];
  // ... other fields
}

export interface AiEditCommit {
  type: "ai_edit";
  parentHash: CommitHash;
  inputs: PromptContent;
  variants: Variant[];
  // ... other fields
}
```

#### Backend (Python)

```python
from typing import TypedDict, List, Literal

class PromptContent(TypedDict):
    text: str
    images: List[str]  # List of data URLs

class GenerationParams(TypedDict):
    generationType: Literal["create", "update"]
    inputMode: Literal["image", "video", "text"]
    prompt: PromptContent
    history: List[PromptContent]  # Optional
    isImportedFromCode: bool      # Optional
    # ... other params
```

### Backend Implementation

#### Prompt Assembly Refactor

The prompt assembly logic will be refactored to handle the unified structure:

```python
# prompts/__init__.py

async def create_prompt(
    params: dict[str, Any], 
    stack: Stack, 
    input_mode: InputMode
) -> tuple[list[ChatCompletionMessageParam], dict[str, str]]:
    """
    Create prompt messages from unified prompt structure.
    Works identically for both create and update operations.
    """
    image_cache: dict[str, str] = {}
    
    # Special handling for imported code
    if params.get("isImportedFromCode"):
        return handle_imported_code_prompt(params, stack), image_cache
    
    # Special handling for video mode
    if input_mode == "video":
        video_url = params["prompt"]["images"][0]
        prompt_messages = await assemble_claude_prompt_video(video_url)
        return prompt_messages, image_cache
    
    # Standard handling for create and update
    prompt_messages = []
    
    # Add system prompt
    prompt_messages.append({
        "role": "system",
        "content": SYSTEM_PROMPTS[stack]
    })
    
    # Add conversation history if present
    if params.get("history"):
        for i, prompt_content in enumerate(params["history"]):
            role = "user" if i % 2 == 0 else "assistant"
            message = create_message_from_prompt_content(
                prompt_content, role, stack
            )
            prompt_messages.append(message)
    
    # Add current prompt
    current_message = create_message_from_prompt_content(
        params["prompt"], "user", stack
    )
    prompt_messages.append(current_message)
    
    # Generate image cache for updates
    if params["generationType"] == "update" and params.get("history"):
        image_cache = extract_image_cache_from_history(params["history"])
    
    return prompt_messages, image_cache


def create_message_from_prompt_content(
    prompt_content: dict, 
    role: str, 
    stack: Stack
) -> ChatCompletionMessageParam:
    """Convert PromptContent to ChatCompletionMessageParam."""
    
    # Assistant messages are always text-only
    if role == "assistant" or not prompt_content.get("images"):
        return {
            "role": role,
            "content": prompt_content["text"]
        }
    
    # User messages can be multi-modal
    content_parts = []
    
    # Add images
    for image_url in prompt_content["images"]:
        content_parts.append({
            "type": "image_url",
            "image_url": {"url": image_url, "detail": "high"}
        })
    
    # Add text
    text = prompt_content["text"]
    if not text and role == "user":
        text = USER_PROMPT if stack != "svg" else SVG_USER_PROMPT
    
    content_parts.append({
        "type": "text",
        "text": text
    })
    
    return {
        "role": role,
        "content": content_parts
    }
```

### Frontend Implementation

#### Phase 1: Backend-Compatible Adapter

Create an adapter to convert current frontend calls to the new structure:

```typescript
// utils/prompt-adapter.ts

export function createPromptContent(
  text: string = "",
  images: string[] = []
): PromptContent {
  return { text, images };
}

export function convertLegacyParams(
  params: LegacyCodeGenerationParams
): CodeGenerationParams {
  if (params.generationType === "create") {
    return {
      ...params,
      prompt: createPromptContent("", [params.image])
    };
  }
  
  // Update: Convert history array to PromptContent array
  const history = params.history?.map(text => 
    createPromptContent(text, [])
  );
  
  return {
    ...params,
    prompt: createPromptContent(
      params.history?.[params.history.length - 1] || "",
      []
    ),
    history
  };
}
```

#### Phase 2: Update UI Components

Add image upload to the update interface:

```typescript
// components/sidebar/UpdateInterface.tsx

interface UpdateInterfaceProps {
  onUpdate: (prompt: PromptContent) => void;
}

export function UpdateInterface({ onUpdate }: UpdateInterfaceProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  
  const handleSubmit = () => {
    onUpdate({ text, images });
    setText("");
    setImages([]);
  };
  
  return (
    <div className="update-interface">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your changes..."
      />
      
      <ImageUploadArea
        images={images}
        onImagesChange={setImages}
        maxImages={5}
        compact={true}
      />
      
      <Button onClick={handleSubmit}>
        Update Code
      </Button>
    </div>
  );
}
```

## Migration Strategy

### Phase 1: Backend Support (Week 1)
1. Implement PromptContent types in backend
2. Update prompt assembly to handle new structure
3. Add backwards compatibility layer
4. Deploy with feature flag

### Phase 2: Frontend Adapter (Week 2)
1. Create adapter functions
2. Update WebSocket communication
3. Test with existing frontend
4. Ensure zero regression

### Phase 3: Update UI (Week 3-4)
1. Add image upload to update interface
2. Update state management
3. Implement image preview/management
4. User testing and iteration

### Phase 4: Full Migration (Week 5-6)
1. Update all frontend code to use new structure
2. Remove adapter layer
3. Update documentation
4. Performance optimization

## API Examples

### Create Request
```json
{
  "generationType": "create",
  "inputMode": "image",
  "prompt": {
    "text": "",
    "images": ["data:image/png;base64,..."]
  }
}
```

### Update Request with Images
```json
{
  "generationType": "update",
  "inputMode": "image",
  "prompt": {
    "text": "Make the header look like this design",
    "images": ["data:image/png;base64,...", "data:image/png;base64,..."]
  },
  "history": [
    {
      "text": "",
      "images": ["data:image/png;base64,..."]
    },
    {
      "text": "<!DOCTYPE html>...",
      "images": []
    },
    {
      "text": "Add a navigation menu",
      "images": []
    },
    {
      "text": "<!DOCTYPE html>...",
      "images": []
    }
  ]
}
```

## Technical Considerations

### Performance
- Image size limits: 20MB per image, 50MB total per request
- Client-side compression for images > 2MB
- Progressive loading for multiple images
- WebSocket message chunking for large payloads

### Security
- Validate image MIME types
- Sanitize data URLs
- Rate limiting: Max 10 images per minute per user
- Storage quotas for history tracking

### Model Compatibility
- All models must support multi-modal inputs
- Graceful fallback for text-only models
- Model-specific image preprocessing

## Future Extensions

### Enhanced PromptContent
```typescript
interface PromptContent {
  text: string;
  images: string[];
  // Future additions:
  annotations?: ImageAnnotation[];  // Draw on images
  audioClips?: string[];           // Voice instructions
  codeSelection?: CodeRange;       // Reference specific code
  metadata?: {
    intent?: "style" | "layout" | "content" | "fix";
    priority?: "high" | "medium" | "low";
    targetElements?: string[];     // CSS selectors
  };
}
```

### Smart Features
1. **Image Diffing**: Show visual differences between versions
2. **Auto-annotations**: Detect UI elements in uploaded images
3. **Style Extraction**: Extract colors, fonts from images
4. **Component Matching**: Find similar components in codebase

## Success Metrics

1. **Adoption**: % of updates using images within 30 days
2. **Quality**: Reduction in iteration count for design changes
3. **Performance**: WebSocket message size and latency
4. **User Satisfaction**: Survey feedback on feature usefulness

## Rollback Plan

If issues arise:
1. Feature flag to disable image uploads in updates
2. Fallback to text-only updates
3. Preserve backward compatibility throughout
4. Clear user communication about temporary limitations

## Open Questions

1. Should we support image ordering/prioritization?
2. How to handle image references in conversation history?
3. Should images be stored or always transmitted as data URLs?
4. Maximum number of images per update?

## Appendix

### Example Use Cases

1. **Style Matching**: "Make the buttons look like this" + design system screenshot
2. **Layout Updates**: "Arrange the cards like this" + layout example
3. **Asset Integration**: "Add this logo to the header" + logo image
4. **Bug Fixes**: "Fix this visual glitch" + screenshot of issue
5. **Component Updates**: "Update the navbar to match this" + new navbar design

### Error Handling

```typescript
class PromptValidationError extends Error {
  constructor(message: string, public details: {
    maxImagesExceeded?: boolean;
    invalidImageFormat?: string[];
    textTooLong?: boolean;
  }) {
    super(message);
  }
}
```
