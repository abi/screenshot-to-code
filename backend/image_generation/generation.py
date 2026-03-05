import asyncio
import time
from typing import List, Literal, Union

from openai import AsyncOpenAI

from image_generation.replicate import (
    DEFAULT_IMAGE_MODEL,
    ReplicateImageModel,
    call_replicate,
)


REPLICATE_BATCH_SIZE = 20
REPLICATE_IMAGE_MODEL: ReplicateImageModel = DEFAULT_IMAGE_MODEL


async def process_tasks(
    prompts: List[str],
    api_key: str,
    base_url: str | None,
    model: Literal["dalle3", "flux"],
) -> List[Union[str, None]]:
    start_time = time.time()
    results: list[str | BaseException | None] = []
    if model == "dalle3":
        tasks = [generate_image_dalle(prompt, api_key, base_url) for prompt in prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    else:
        for i in range(0, len(prompts), REPLICATE_BATCH_SIZE):
            batch = prompts[i : i + REPLICATE_BATCH_SIZE]
            tasks = [generate_image_replicate(p, api_key) for p in batch]
            results.extend(await asyncio.gather(*tasks, return_exceptions=True))
    end_time = time.time()
    generation_time = end_time - start_time
    print(f"Image generation time: {generation_time:.2f} seconds")

    processed_results: List[Union[str, None]] = []
    for result in results:
        if isinstance(result, BaseException):
            print(f"An exception occurred: {result}")
            processed_results.append(None)
        else:
            processed_results.append(result)

    return processed_results


async def generate_image_dalle(
    prompt: str, api_key: str, base_url: str | None
) -> Union[str, None]:
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    res = await client.images.generate(
        model="dall-e-3",
        quality="standard",
        style="natural",
        n=1,
        size="1024x1024",
        prompt=prompt,
    )
    await client.close()
    if not res.data:
        return None
    return res.data[0].url


async def generate_image_replicate(prompt: str, api_key: str) -> str:
    replicate_input: dict[str, str | int | float | bool]
    if REPLICATE_IMAGE_MODEL == "flux_2_klein":
        replicate_input = {
            "prompt": prompt,
            "aspect_ratio": "1:1",
            "output_format": "png",
        }
    else:
        # Default to z-image-turbo with a square output.
        replicate_input = {
            "prompt": prompt,
            "width": 1024,
            "height": 1024,
            "go_fast": False,
            "output_format": "png",
            "guidance_scale": 0,
            "num_inference_steps": 8,
        }

    return await call_replicate(
        replicate_input,
        api_key,
        model=REPLICATE_IMAGE_MODEL,
    )
