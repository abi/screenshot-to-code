import toast from "react-hot-toast";

const WS_BACKEND_URL = import.meta.env.VITE_WS_BACKEND_URL;
const ERROR_MESSAGE =
  "Error generating code. Check the Developer Console for details. Feel free to open a Github ticket";

export function generateCode(
  imageUrl: string,
  onChange: (chunk: string) => void,
  onComplete: () => void
) {
  const wsUrl = `${WS_BACKEND_URL}/generate-code`;
  console.log("Connecting to backend @ ", wsUrl);

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({
        image: imageUrl,
      })
    );
  });

  ws.addEventListener("message", async (event: MessageEvent) => {
    const response = JSON.parse(event.data);
    if (response.type === "chunk") {
      onChange(response.value);
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
