# Load environment variables first
from dotenv import load_dotenv

load_dotenv()


from fastapi import FastAPI, WebSocket
from llm import stream_openai_response

app = FastAPI()


@app.websocket("/generate-code")
async def stream_code_test(websocket: WebSocket):
    await websocket.accept()

    result = await websocket.receive_json()

    async def process_chunk(content):
        await websocket.send_json({"type": "chunk", "value": content})

    await stream_openai_response(
        [
            {"role": "system", "content": "Build a webapp"},
            {"role": "user", "content": "Build a hello world app"},
        ],
        lambda x: process_chunk(x),
    )
