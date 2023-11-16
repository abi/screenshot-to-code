import toast from "react-hot-toast";

const WS_BACKEND_URL =
  import.meta.env.VITE_WS_BACKEND_URL || "ws://127.0.0.1:7000";
const ERROR_MESSAGE =
  "Error generating code. Check the Developer Console for details. Feel free to open a Github issue";

export interface CodeGenerationParams {
  generationType: "create" | "update";
  image: string;
  history?: string[];
  // isImageGenerationEnabled: boolean; // TODO: Merge with Settings type in types.ts
}

export function generateCode(
  params: CodeGenerationParams,
  onChange: (chunk: string) => void,
  onSetCode: (code: string) => void,
  onStatusUpdate: (status: string) => void,
  onComplete: () => void
) {
  const wsUrl = `${WS_BACKEND_URL}/generate-code`;
  console.log("Connecting to backend @ ", wsUrl);

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify(params));
  });

  ws.addEventListener("message", async (event: MessageEvent) => {
    const response = JSON.parse(event.data);
    if (response.type === "chunk") {
      onChange(response.value);
    } else if (response.type === "status") {
      onStatusUpdate(response.value);
    } else if (response.type === "setCode") {
      onSetCode(response.value);
    }
  });

  ws.addEventListener("close", (event) => {
    console.log("Connection closed", event.code, event.reason);
    if (event.code != 1000) {
      console.error("WebSocket error code", event);
      toast.error(ERROR_MESSAGE);
    } else {
      onComplete();
    }
  });

  ws.addEventListener("error", (error) => {
    console.error("WebSocket error", error);
    toast.error(ERROR_MESSAGE);
  });
}
