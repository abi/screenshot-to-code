import asyncio
import time
from typing import List, Literal, Union

from openai import AsyncOpenAI

from image_generation.aspect_ratios import (
    AspectRatio,
    DEFAULT_ASPECT_RATIO,
)
from image_generation.replicate import call_replicate


REPLICATE_BATCH_SIZE = 20


async def process_tasks(
    prompts: List[str],
    api_key: str,
    base_url: str | None,
    model: Literal["dalle3", "flux"],
    aspect_ratio: AspectRatio = DEFAULT_ASPECT_RATIO,
) -> List[Union[str, None]]:
    start_time = time.time()
    if model == "dalle3":
        tasks = [generate_image_dalle(prompt, api_key, base_url) for prompt in prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    else:
        results: list[str | None | BaseException] = []
        for i in range(0, len(prompts), REPLICATE_BATCH_SIZE):
            batch = prompts[i : i + REPLICATE_BATCH_SIZE]
            tasks = [generate_image_replicate(p, api_key, aspect_ratio) for p in batch]
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
    prompt: str,
    api_key: str,
    base_url: str | None,
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


async def generate_image_replicate(
    prompt: str,
    api_key: str,
    aspect_ratio: AspectRatio = DEFAULT_ASPECT_RATIO,
) -> str:
    # We use Flux 2 Klein
    return await call_replicate(
        {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": "png",
        },
        api_key,
    )
