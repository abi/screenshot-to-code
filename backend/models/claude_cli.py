import asyncio
import json
import subprocess
import tempfile
import time
from typing import Any, Awaitable, Callable, Dict, List, Tuple
from openai.types.chat import ChatCompletionMessageParam
from llm import Completion


def convert_messages_to_claude_cli_format(
    messages: List[ChatCompletionMessageParam],
) -> Tuple[str, str, List[str]]:
    """
    Convert OpenAI format messages to Claude CLI format.
    Save images to temporary files for CLI access.
    
    Returns:
        Tuple of (system_prompt, combined_prompt, image_paths)
    """
    import base64
    import tempfile
    import os
    
    system_prompt = ""
    user_messages = []
    image_paths = []
    
    for message in messages:
        role = message.get("role", "")
        content = message.get("content", "")
        
        if role == "system":
            system_prompt = str(content)
        elif role == "user":
            if isinstance(content, list):
                # Handle mixed content (text + images)
                text_parts = []
                for item in content:
                    if item.get("type") == "text":
                        text_parts.append(item.get("text", ""))
                    elif item.get("type") == "image_url":
                        # Extract image data and save to temp file
                        image_data_url = item.get("image_url", {}).get("url", "")
                        if image_data_url.startswith("data:image/"):
                            try:
                                # Extract base64 data
                                header, data = image_data_url.split(",", 1)
                                image_data = base64.b64decode(data)
                                
                                # Determine file extension
                                if "jpeg" in header or "jpg" in header:
                                    ext = ".jpg"
                                elif "png" in header:
                                    ext = ".png"
                                elif "webp" in header:
                                    ext = ".webp"
                                else:
                                    ext = ".png"  # default
                                
                                # Save to temp file
                                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext, prefix="claude_cli_image_")
                                temp_file.write(image_data)
                                temp_file.close()
                                image_paths.append(temp_file.name)
                                
                                # Reference the image file in the prompt
                                text_parts.append(f"Please analyze the image at: {temp_file.name}")
                                
                            except Exception as e:
                                text_parts.append(f"[Error processing image: {str(e)}]")
                        else:
                            text_parts.append("[Image could not be processed - invalid format]")
                user_messages.append("\n".join(text_parts))
            else:
                user_messages.append(str(content))
    
    combined_prompt = "\n\n".join(user_messages)
    if system_prompt:
        combined_prompt = f"System: {system_prompt}\n\nUser: {combined_prompt}"
    
    return system_prompt, combined_prompt, image_paths


async def stream_claude_cli_response(
    messages: List[ChatCompletionMessageParam],
    callback: Callable[[str], Awaitable[None]],
    model_name: str = "claude-3-5-sonnet-20241022",
) -> Completion:
    """
    Stream Claude response using Claude Code CLI instead of API.
    """
    start_time = time.time()
    
    # Convert messages to CLI format
    system_prompt, combined_prompt, image_paths = convert_messages_to_claude_cli_format(messages)
    
    try:
        # Build claude CLI command - use --print for non-interactive mode
        # Pass prompt via stdin to avoid permission issues
        cmd = [
            "claude",
            "--print",
            "--model", model_name,
            "--dangerously-skip-permissions"  # Skip permissions for automated use
        ]
        
        # Start subprocess with stdin
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        response = ""
        
        # Send prompt to stdin and close it
        if process.stdin:
            process.stdin.write(combined_prompt)
            process.stdin.close()
        
        # Stream output
        if process.stdout:
            while True:
                char = process.stdout.read(1)
                if not char:
                    break
                response += char
                await callback(char)
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode != 0:
            error_msg = process.stderr.read() if process.stderr else "Unknown error"
            raise Exception(f"Claude CLI failed: {error_msg}")
            
    finally:
        # Clean up image temp files
        import os
        for image_path in image_paths:
            try:
                os.unlink(image_path)
            except:
                pass
    
    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": response}


async def stream_claude_cli_response_native(
    system_prompt: str,
    messages: list[Any],
    callback: Callable[[str], Awaitable[None]],
    include_thinking: bool = False,
    model_name: str = "claude-3-5-sonnet-20241022",
) -> Completion:
    """
    Native Claude CLI streaming response.
    """
    start_time = time.time()
    
    # Combine system prompt and messages
    full_prompt = f"System: {system_prompt}\n\n"
    
    for message in messages:
        role = message.get("role", "")
        content = message.get("content", "")
        full_prompt += f"{role.capitalize()}: {content}\n\n"
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
        temp_file.write(full_prompt)
        temp_file_path = temp_file.name
    
    try:
        # Build command - use stdin and skip permissions
        cmd = [
            "claude", 
            "--print", 
            "--model", model_name, 
            "--dangerously-skip-permissions"
        ]
        
        # Start subprocess
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        response = ""
        
        # Send prompt via stdin
        if process.stdin:
            process.stdin.write(full_prompt)
            process.stdin.close()
        
        # Stream output character by character
        if process.stdout:
            while True:
                char = process.stdout.read(1)
                if not char:
                    break
                response += char
                await callback(char)
        
        # Wait for completion
        process.wait()
        
        if process.returncode != 0:
            error_msg = process.stderr.read() if process.stderr else "Unknown error"
            raise Exception(f"Claude CLI failed: {error_msg}")
            
    finally:
        # Clean up
        import os
        try:
            os.unlink(temp_file_path)
        except:
            pass
    
    completion_time = time.time() - start_time
    return {"duration": completion_time, "code": response}