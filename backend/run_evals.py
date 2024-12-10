# Load environment variables first
from dotenv import load_dotenv

load_dotenv()

import asyncio
from evals.runner import run_image_evals


async def main():
    await run_image_evals()


if __name__ == "__main__":
    asyncio.run(main())
