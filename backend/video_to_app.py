# Load environment variables first
import base64
import shutil
from dotenv import load_dotenv

load_dotenv()

import time
import subprocess
import os
from typing import Union
import asyncio
from datetime import datetime
from prompts.claude_prompts import VIDEO_PROMPT, VIDEO_PROMPT_ALPINE_JS
from utils import pprint_prompt
from config import ANTHROPIC_API_KEY
from llm import (
    MODEL_CLAUDE_OPUS,
    # MODEL_CLAUDE_SONNET,
    stream_claude_response_native,
)

STACK = "html_tailwind"

VIDEO_DIR = "./video_evals/videos"
SCREENSHOTS_DIR = "./video_evals/screenshots"
OUTPUTS_DIR = "./video_evals/outputs"


async def main():

    video_filename = "mortgage-calculator.mov"
    screenshot_interval = 850
    is_followup = False

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
        print(previous_html_file)
        with open(previous_html_file, "r") as file:
            previous_html = file.read()

    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    # Create the SCREENSHOTS_DIR if it doesn't exist
    if not os.path.exists(SCREENSHOTS_DIR):
        os.makedirs(SCREENSHOTS_DIR)

    # Clear out the SCREENSHOTS_DIR before generating new screenshots
    for filename in os.listdir(SCREENSHOTS_DIR):
        file_path = os.path.join(SCREENSHOTS_DIR, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")

    # Split the video into screenshots
    split_video_into_screenshots(
        os.path.join(VIDEO_DIR, video_filename), SCREENSHOTS_DIR, screenshot_interval
    )

    # Get all the screenshots in the directory
    screenshots = [f for f in os.listdir(SCREENSHOTS_DIR) if f.endswith(".jpg")]

    if len(screenshots) > 20:
        print(f"Too many screenshots: {len(screenshots)}")
        return

    input_image_urls: list[str] = []
    sorted_screenshots = sorted(screenshots, key=lambda x: int(x.split(".")[0]))
    for filename in sorted_screenshots:
        filepath = os.path.join(SCREENSHOTS_DIR, filename)
        data_url = await image_to_data_url(filepath)
        print(filename)
        input_image_urls.append(data_url)

    # Convert images to the message format for Claude
    content_messages: list[dict[str, Union[dict[str, str], str]]] = []
    for url in input_image_urls:
        media_type = url.split(";")[0].split(":")[1]
        base64_data = url.split(",")[1]
        content_messages.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64_data,
                },
            }
        )

    prompt_messages = [
        {
            "role": "user",
            "content": content_messages,
        },
        # {"role": "assistant", "content": SECOND_MESSAGE},
        # {"role": "user", "content": "continue"},
    ]

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
        model=MODEL_CLAUDE_OPUS,
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

    # Show a notification
    subprocess.run(["osascript", "-e", 'display notification "Coding Complete"'])


# Extract HTML content from the completion string
def extract_tag_content(tag: str, text: str) -> str:
    """
    Extracts content for a given tag from the provided text.

    :param tag: The tag to search for.
    :param text: The text to search within.
    :return: The content found within the tag, if any.
    """
    tag_start = f"<{tag}>"
    tag_end = f"</{tag}>"
    start_idx = text.find(tag_start)
    end_idx = text.find(tag_end, start_idx)
    if start_idx != -1 and end_idx != -1:
        return text[start_idx : end_idx + len(tag_end)]
    return ""


def split_video_into_screenshots(video_path: str, output_dir: str, interval: int):
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Calculate the number of zeros needed for padding
    # duration = float(
    #     subprocess.check_output(
    #         [
    #             "ffprobe",
    #             "-v",
    #             "error",
    #             "-show_entries",
    #             "format=duration",
    #             "-of",
    #             "default=noprint_wrappers=1:nokey=1",
    #             video_path,
    #         ]
    #     )
    # )

    # Run the ffmpeg command to extract screenshots
    subprocess.call(
        [
            "ffmpeg",
            "-i",
            video_path,
            "-vf",
            f"fps=1/{interval/1000}",
            f"{output_dir}/%d.jpg",
        ]
    )


# TODO: Don't hard-code the media type
async def image_to_data_url(filepath: str):
    with open(filepath, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode()
        return f"data:image/jpeg;base64,{encoded_string}"


asyncio.run(main())
