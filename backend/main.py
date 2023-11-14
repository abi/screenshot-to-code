# Load environment variables first
from dotenv import load_dotenv
import os
from datetime import datetime

from prompts import assemble_prompt

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

    messages = assemble_prompt("")
    print(messages)

    # Create run_logs directory if it doesn't exist
    if not os.path.exists('run_logs'):
        os.makedirs('run_logs')

    # Generate a unique filename using the current timestamp
    filename = datetime.now().strftime('run_logs/messages_%Y%m%d_%H%M%S.json')

    # Write the messages dict into a new file for each run
    with open(filename, "w") as f:
        f.write(str(messages))

    await stream_openai_response(
        messages,
        lambda x: process_chunk(x),
    )
