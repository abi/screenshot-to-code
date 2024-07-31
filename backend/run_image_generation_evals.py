import asyncio
import os
from typing import List, Optional, Literal
from dotenv import load_dotenv
import aiohttp
from image_generation.core import process_tasks

EVALS = [
    "Romantic Background",
    "Company logo: A stylized green sprout emerging from a circle",
    "Placeholder image of a PDF cover with abstract design",
    "A complex bubble diagram showing various interconnected features and aspects of FestivalPro, with a large central bubble surrounded by smaller bubbles of different colors representing different categories and functionalities",
    "A vibrant, abstract visualization of the RhythmRise experience ecosystem, featuring interconnected neon elements representing music, technology, and human connection",
    "Banner with text 'LiblibAI学院 课程入口'",
    "Profile picture of Pierre-Louis Labonne",
    "Two hands holding iPhone 14 models with colorful displays",
    "Portrait of a woman with long dark hair smiling at the camera",
    "Threadless logo on a gradient background from light pink to coral",
    "Jordan Schlansky Shows Conan His Favorite Nose Hair Trimmer",
    "Team Coco",
    "Intro to Large Language Models",
    "Andrej Karpathy",
    "He built a $200 million toy company",
    "CNBC International",
    "What will happen in year three of the war?",
    "Channel",
    "This is it",
    "How ASML Dominates Chip Machines",
]

# Load environment variables
load_dotenv()

# Get API keys from environment variables
OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
REPLICATE_API_TOKEN: Optional[str] = os.getenv("REPLICATE_API_TOKEN")

# Directory to save generated images
OUTPUT_DIR: str = "generated_images"


async def generate_and_save_images(
    prompts: List[str],
    model: Literal["dalle3", "sdxl-lightning"],
    api_key: Optional[str],
) -> None:
    # Ensure the output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if api_key is None:
        raise ValueError(f"API key for {model} is not set in the environment variables")

    # Generate images
    results: List[Optional[str]] = await process_tasks(
        prompts, api_key, None, model=model
    )

    # Save images to disk
    async with aiohttp.ClientSession() as session:
        for i, image_url in enumerate(results):
            if image_url:
                # Get the image data
                async with session.get(image_url) as response:
                    image_data: bytes = await response.read()

                # Save the image with a filename based on the input eval
                prefix = "replicate_" if model == "sdxl-lightning" else "dalle3_"
                filename: str = (
                    f"{prefix}{prompts[i][:50].replace(' ', '_').replace(':', '')}.png"
                )
                filepath: str = os.path.join(OUTPUT_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(image_data)
                print(f"Saved {model} image: {filepath}")
            else:
                print(f"Failed to generate {model} image for prompt: {prompts[i]}")


async def main() -> None:
    # await generate_and_save_images(EVALS, "dalle3", OPENAI_API_KEY)
    await generate_and_save_images(EVALS, "sdxl-lightning", REPLICATE_API_TOKEN)


if __name__ == "__main__":
    asyncio.run(main())
