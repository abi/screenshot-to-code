import io
from typing import Awaitable, Callable, List, Any
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk
import google.generativeai as genai
from PIL import Image
import base64
import os


MODEL_GPT_4_VISION = "gpt-4-vision-preview"
MODEL_GEMINI_PRO_VISION = "models/gemini-pro-vision"

async def format_response(response: str)-> str:
    response = response.strip()
    if response.startswith('```'):
        response = '\n'.join(response.split('\n')[1:-2])
    return response

async def format_messages_for_gemnini(messages: List[Any]):
    system_promt = messages[0]['content']
    image_base64 = messages[1]['content'][0]['image_url']['url']
    additional_prompt = messages[1]['content'][1]['text']
    
    base64_data = image_base64.split(",")[1]
    decoded_bytes = base64.b64decode(base64_data)
    
    image_bytes = io.BytesIO(decoded_bytes)
    
    image = Image.open(image_bytes)
    
    return [system_promt, image, additional_prompt]

async def stream_openai_response(
    messages: List[ChatCompletionMessageParam],
    api_key: str,
    base_url: str | None,
    callback: Callable[[str], Awaitable[None]],
) -> str:
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    model = MODEL_GPT_4_VISION

    # Base parameters
    params = {"model": model, "messages": messages, "stream": True, "timeout": 600}

    # Add 'max_tokens' only if the model is a GPT4 vision model
    if model == MODEL_GPT_4_VISION:
        params["max_tokens"] = 4096
        params["temperature"] = 0

    stream = await client.chat.completions.create(**params)  # type: ignore
    full_response = ""
    async for chunk in stream:  # type: ignore
        assert isinstance(chunk, ChatCompletionChunk)
        content = chunk.choices[0].delta.content or ""
        full_response += content
        await callback(content)

    await client.close()

    return full_response

async def stream_gemini_response(
    messages: List[Any] = [],
    api_key: str = os.getenv('GOOGLE_API_KEY', ''),
    callback: Callable[[str], Awaitable[None]] | None = None,
) -> str:
    genai.configure(api_key=api_key)
    
    model = genai.GenerativeModel('gemini-pro-vision')
    general_config = {
        "max_output_tokens": 2048,  
        "temperature": 0.4,
        "top_p": 1,
        "top_k": 32
    }

    formatted_messages = await format_messages_for_gemnini(messages)
    
    response = model.generate_content(
        formatted_messages, 
        stream=True,
        generation_config=general_config    # type: ignore
    )
    response.resolve()
    result = await format_response(response.text)
    
    while "</html>" not in result:
      continue_prompt = "Generate the rest of the code below"
      formatted_messages.append(continue_prompt)
      formatted_messages.append(result)
      
      response = model.generate_content(
        formatted_messages,
        stream=True,
        generation_config=general_config    # type: ignore
      )
      response.resolve()
      result += await format_response(response.text)
      
    result = result.strip()
    return result
