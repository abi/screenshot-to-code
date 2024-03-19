# Load environment variables first

from dotenv import load_dotenv

load_dotenv()


import base64
import mimetypes
import time
import subprocess
import os
import asyncio
from datetime import datetime
from prompts.claude_prompts import VIDEO_PROMPT
from utils import pprint_prompt
from config import ANTHROPIC_API_KEY
from video.utils import extract_tag_content, assemble_claude_prompt_video
from llm import (
    Llm,
    stream_claude_response_native,
)

STACK = "html_tailwind"

VIDEO_DIR = "./video_evals/videos"
SCREENSHOTS_DIR = "./video_evals/screenshots"
OUTPUTS_DIR = "./video_evals/outputs"


async def main():
    video_filename = "shortest.mov"
    is_followup = False

    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    # Get previous HTML
    previous_html = ""
    if is_followup:
        previous_html_file = max(
            [
                os.path.join(OUTPUTS_DIR, f)
                for f in os.listdir(OUTPUTS_DIR)
                if f.endswith(".html")
            ],
            key=os.path.getctime,
        )
        with open(previous_html_file, "r") as file:
            previous_html = file.read()

    video_file = os.path.join(VIDEO_DIR, video_filename)
    mime_type = mimetypes.guess_type(video_file)[0]
    with open(video_file, "rb") as file:
        video_content = file.read()
    video_data_url = (
        f"data:{mime_type};base64,{base64.b64encode(video_content).decode('utf-8')}"
    )

    prompt_messages = await assemble_claude_prompt_video(video_data_url)

    # Tell the model to continue
    # {"role": "assistant", "content": SECOND_MESSAGE},
    # {"role": "user", "content": "continue"},

    if is_followup:
        prompt_messages += [
            {"role": "assistant", "content": previous_html},
            {
                "role": "user",
                "content": "You've done a good job with a first draft. Improve this further based on the original instructions so that the app is fully functional like in the original video.",
            },
        ]  # type: ignore

    async def process_chunk(content: str):
        print(content, end="", flush=True)

    response_prefix = "<thinking>"

    pprint_prompt(prompt_messages)  # type: ignore

    start_time = time.time()

    completion = await stream_claude_response_native(
        system_prompt=VIDEO_PROMPT,
        messages=prompt_messages,
        api_key=ANTHROPIC_API_KEY,
        callback=lambda x: process_chunk(x),
        model=Llm.CLAUDE_3_OPUS,
        include_thinking=True,
    )

    end_time = time.time()

    # Prepend the response prefix to the completion
    completion = response_prefix + completion

    # Extract the outputs
    html_content = extract_tag_content("html", completion)
    thinking = extract_tag_content("thinking", completion)

    print(thinking)
    print(f"Operation took {end_time - start_time} seconds")

    os.makedirs(OUTPUTS_DIR, exist_ok=True)

    # Generate a unique filename based on the current time
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"video_test_output_{timestamp}.html"
    output_path = os.path.join(OUTPUTS_DIR, filename)

    # Write the HTML content to the file
    with open(output_path, "w") as file:
        file.write(html_content)

    print(f"Output file path: {output_path}")

    # Show a notification
    subprocess.run(["osascript", "-e", 'display notification "Coding Complete"'])


asyncio.run(main())
