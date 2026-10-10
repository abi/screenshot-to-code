# Load environment variables first
from dotenv import load_dotenv

load_dotenv()

import argparse
import asyncio
import os

from evals.runner import run_image_evals
from prompts.prompt_types import Stack


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run screenshot-to-code evals")
    parser.add_argument("--stack", type=str, required=True,
                        choices=["html", "react", "vue", "svelte", "html_tailwind"],
                        help="UI stack to generate")
    parser.add_argument("--model", type=str, required=True,
                        help="Model name (e.g. gpt-4o, claude-3-5-sonnet)")
    parser.add_argument("--n", type=int, default=1,
                        help="Number of attempts per image (default: 1)")
    parser.add_argument("--offline", action="store_true",
                        help=(
                            "Skip screenshot_preview tool calls. "
                            "Enables eval runs without a running Playwright/browser. "
                            "Useful for CI or offline benchmarking."
                        ))
    parser.add_argument("--input-dir", type=str, default=None,
                        help="Input directory (default: evals_data/inputs)")
    args = parser.parse_args()

    await run_image_evals(
        stack=Stack(args.stack),
        model=args.model,
        n=args.n,
        offline=args.offline,
    )


if __name__ == "__main__":
    asyncio.run(main())
