import argparse
import asyncio
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Literal, TypedDict, cast
from urllib.parse import urlparse

import aiohttp
from dotenv import load_dotenv
from typing_extensions import NotRequired

from image_generation.replicate import (
    FLUX_2_KLEIN_MODEL_PATH,
    Z_IMAGE_TURBO_MODEL_PATH,
    call_replicate_model,
)


ReplicateEvalModel = Literal["flux_2_klein", "z_image_turbo"]


class PromptItem(TypedDict):
    id: str
    category: str
    prompt: str


class EvalResult(TypedDict):
    id: str
    category: str
    prompt: str
    status: str
    total_seconds: NotRequired[float]
    source_url: NotRequired[str]
    file: NotRequired[str]
    generation_seconds: NotRequired[float]
    download_seconds: NotRequired[float]
    bytes: NotRequired[int]
    error: NotRequired[str]


MODEL_PATHS: dict[ReplicateEvalModel, str] = {
    "flux_2_klein": FLUX_2_KLEIN_MODEL_PATH,
    "z_image_turbo": Z_IMAGE_TURBO_MODEL_PATH,
}

DEFAULT_PROMPT_FILE = Path("image_generation/eval_sets/recent_assets_20_prompts.json")
DEFAULT_OUTPUT_ROOT = Path("image_generation/eval_results")


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:60] or "prompt"


def load_prompts(prompt_file: Path) -> list[PromptItem]:
    raw: Any = json.loads(prompt_file.read_text())
    if not isinstance(raw, list):
        raise ValueError("Prompt file must contain a JSON array.")

    prompts: list[PromptItem] = []
    for index, item in enumerate(cast(list[Any], raw), start=1):
        if isinstance(item, str):
            prompts.append(
                {
                    "id": f"{index:03d}",
                    "category": "Prompt",
                    "prompt": item,
                }
            )
            continue

        if not isinstance(item, dict):
            raise ValueError(f"Prompt item {index} must be a string or object.")

        item_dict = cast(dict[str, Any], item)
        prompt = item_dict.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(f"Prompt item {index} is missing a prompt string.")

        prompt_id = item_dict.get("id")
        category = item_dict.get("category")
        prompts.append(
            {
                "id": prompt_id if isinstance(prompt_id, str) else f"{index:03d}",
                "category": category if isinstance(category, str) else "Prompt",
                "prompt": prompt,
            }
        )

    return prompts


def build_replicate_input(
    model: ReplicateEvalModel, prompt: str
) -> dict[str, str | int | float | bool]:
    if model == "flux_2_klein":
        return {
            "prompt": prompt,
            "aspect_ratio": "1:1",
            "output_format": "png",
        }

    return {
        "prompt": prompt,
        "width": 1024,
        "height": 1024,
        "go_fast": False,
        "output_format": "png",
        "guidance_scale": 0,
        "num_inference_steps": 8,
    }


def extract_output_url(result: Any, model: ReplicateEvalModel) -> str:
    if isinstance(result, str):
        return result

    if isinstance(result, dict):
        url = cast(dict[str, Any], result).get("url")
        if isinstance(url, str) and url:
            return url

    if isinstance(result, list) and result:
        first = cast(list[Any], result)[0]
        if isinstance(first, str) and first:
            return first
        if isinstance(first, dict):
            url = cast(dict[str, Any], first).get("url")
            if isinstance(url, str) and url:
                return url

    raise ValueError(f"Unexpected response from {model}: {result}")


async def generate_image(
    model: ReplicateEvalModel, prompt: str, api_key: str
) -> str:
    result = await call_replicate_model(
        MODEL_PATHS[model],
        build_replicate_input(model, prompt),
        api_key,
    )
    return extract_output_url(result, model)


async def download_image(
    session: aiohttp.ClientSession, url: str, path: Path
) -> int:
    async with session.get(url) as response:
        response.raise_for_status()
        data = await response.read()
    path.write_bytes(data)
    return len(data)


async def run_one(
    session: aiohttp.ClientSession,
    output_dir: Path,
    model: ReplicateEvalModel,
    item: PromptItem,
    api_key: str,
) -> EvalResult:
    started = time.perf_counter()
    output: EvalResult = {
        "id": item["id"],
        "category": item["category"],
        "prompt": item["prompt"],
        "status": "failed",
    }

    try:
        image_url = await generate_image(model, item["prompt"], api_key)
        generated_at = time.perf_counter()
        suffix = Path(urlparse(image_url).path).suffix or ".png"
        filename = f"{item['id']}_{slugify(item['category'])}{suffix}"
        byte_count = await download_image(session, image_url, output_dir / filename)
        completed = time.perf_counter()
        generation_seconds = round(generated_at - started, 3)
        download_seconds = round(completed - generated_at, 3)
        total_seconds = round(completed - started, 3)

        output.update(
            {
                "status": "ok",
                "source_url": image_url,
                "file": filename,
                "generation_seconds": generation_seconds,
                "download_seconds": download_seconds,
                "total_seconds": total_seconds,
                "bytes": byte_count,
            }
        )
        print(
            f"ok {item['id']} {model} generation={generation_seconds}s "
            f"total={total_seconds}s {filename}",
            flush=True,
        )
    except Exception as exc:
        completed = time.perf_counter()
        total_seconds = round(completed - started, 3)
        output.update(
            {
                "error": str(exc),
                "total_seconds": total_seconds,
            }
        )
        print(
            f"failed {item['id']} {model} total={total_seconds}s error={exc}",
            flush=True,
        )

    return output


async def run_model(
    model: ReplicateEvalModel,
    prompts: list[PromptItem],
    api_key: str,
    output_root: Path,
) -> Path:
    run_id = time.strftime("%Y%m%d_%H%M%S")
    output_dir = output_root / f"{run_id}_{model}"
    output_dir.mkdir(parents=True, exist_ok=True)

    started = time.perf_counter()
    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            *(run_one(session, output_dir, model, item, api_key) for item in prompts)
        )
    completed = time.perf_counter()

    success_count = sum(1 for result in results if result["status"] == "ok")
    manifest: dict[str, Any] = {
        "run_id": run_id,
        "model_label": model,
        "model_path": MODEL_PATHS[model],
        "output_dir": str(output_dir),
        "total_wall_seconds": round(completed - started, 3),
        "count": len(results),
        "success_count": success_count,
        "failure_count": len(results) - success_count,
        "results": results,
    }

    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (output_dir / "timings.tsv").write_text(
        "id\tcategory\tstatus\tgeneration_seconds\tdownload_seconds\t"
        "total_seconds\tfile\tprompt\n"
        + "".join(
            f"{result['id']}\t{result['category']}\t{result['status']}\t"
            f"{result.get('generation_seconds', '')}\t"
            f"{result.get('download_seconds', '')}\t"
            f"{result.get('total_seconds', '')}\t"
            f"{result.get('file', '')}\t"
            f"{result['prompt'].replace(chr(9), ' ')}\n"
            for result in results
        )
    )

    print(
        f"manifest={output_dir / 'manifest.json'}\n"
        f"total_wall_seconds={manifest['total_wall_seconds']} "
        f"success={manifest['success_count']} failure={manifest['failure_count']}"
    )
    return output_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Replicate image generation evals.")
    parser.add_argument("--prompt-file", type=Path, default=DEFAULT_PROMPT_FILE)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument(
        "--model",
        choices=["flux_2_klein", "z_image_turbo", "both"],
        default="z_image_turbo",
    )
    return parser.parse_args()


async def main() -> None:
    load_dotenv(Path(".env"))
    args = parse_args()
    api_key = os.environ.get("REPLICATE_API_KEY") or os.environ.get(
        "REPLICATE_API_TOKEN"
    )
    if not api_key:
        raise SystemExit("Missing REPLICATE_API_KEY or REPLICATE_API_TOKEN")

    prompts = load_prompts(args.prompt_file)
    models: list[ReplicateEvalModel]
    if args.model == "both":
        models = ["flux_2_klein", "z_image_turbo"]
    else:
        models = [args.model]

    for model in models:
        await run_model(model, prompts, api_key, args.output_root)


if __name__ == "__main__":
    asyncio.run(main())
