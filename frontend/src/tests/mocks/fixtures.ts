// Mock code generation responses extracted from backend/mock_llm.py

export const SIMPLE_BUTTON_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Button</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-gray-100">
    <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Howdy
    </button>
</body>
</html>`;

export const SIMPLE_BUTTON_UPDATED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Button</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-gray-100">
    <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded underline">
        Howdy
    </button>
</body>
</html>`;

export const APPLE_MOCK_CODE = `<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Showcase</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
    <nav class="py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div class="flex items-center">
                <img src="https://placehold.co/24x24" alt="Company Logo" class="mr-8">
                <a href="#" class="text-white text-sm font-medium mr-4">Store</a>
                <a href="#" class="text-white text-sm font-medium mr-4">Mac</a>
            </div>
        </div>
    </nav>
    <main class="mt-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center">
                <h1 class="text-5xl font-bold mb-4">WATCH SERIES 9</h1>
                <p class="text-2xl font-medium mb-8">Smarter. Brighter. Mightier.</p>
            </div>
        </div>
    </main>
</body>
</html>`;

// WebSocket message types as defined in generateCode.ts
export type WebSocketMessageType =
  | "chunk"
  | "status"
  | "setCode"
  | "error"
  | "variantComplete"
  | "variantError"
  | "variantCount"
  | "thinking";

export interface WebSocketMessage {
  type: WebSocketMessageType;
  value: string;
  variantIndex: number;
}

// Helper to create a sequence of WebSocket messages that simulate code generation
export function createCodeGenerationMessages(
  code: string,
  chunkSize: number = 100
): WebSocketMessage[] {
  const messages: WebSocketMessage[] = [];

  // Start with variant count
  messages.push({
    type: "variantCount",
    value: "1",
    variantIndex: 0,
  });

  // Send status
  messages.push({
    type: "status",
    value: "Generating code...",
    variantIndex: 0,
  });

  // Send code in chunks
  for (let i = 0; i < code.length; i += chunkSize) {
    messages.push({
      type: "chunk",
      value: code.slice(i, i + chunkSize),
      variantIndex: 0,
    });
  }

  // Send variant complete
  messages.push({
    type: "variantComplete",
    value: "",
    variantIndex: 0,
  });

  return messages;
}

// Helper to create messages for an update operation
export function createUpdateMessages(
  updatedCode: string,
  chunkSize: number = 100
): WebSocketMessage[] {
  const messages: WebSocketMessage[] = [];

  messages.push({
    type: "variantCount",
    value: "1",
    variantIndex: 0,
  });

  messages.push({
    type: "status",
    value: "Applying changes...",
    variantIndex: 0,
  });

  for (let i = 0; i < updatedCode.length; i += chunkSize) {
    messages.push({
      type: "chunk",
      value: updatedCode.slice(i, i + chunkSize),
      variantIndex: 0,
    });
  }

  messages.push({
    type: "variantComplete",
    value: "",
    variantIndex: 0,
  });

  return messages;
}

// Helper to create error messages
export function createErrorMessages(errorMessage: string): WebSocketMessage[] {
  return [
    {
      type: "variantCount",
      value: "1",
      variantIndex: 0,
    },
    {
      type: "variantError",
      value: errorMessage,
      variantIndex: 0,
    },
  ];
}
