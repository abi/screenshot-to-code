import toast from "react-hot-toast";

const WS_BACKEND_URL = "ws://localhost:8000";

export function generateCode(
  imageUrl: string,
  onChange: (chunk: string) => void
) {
  const ws = new WebSocket(`${WS_BACKEND_URL}/generate-code`);

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
      toast.error(
        "We ran into an error. Try again or contact support at support@picoapps.xyz"
      );
    }
  });

  ws.addEventListener("error", (error) => {
    console.error("WebSocket error", error);
    toast.error(
      "We ran into an error. Try again or contact support at support@picoapps.xyz"
    );
  });
}
