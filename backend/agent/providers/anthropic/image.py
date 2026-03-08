# pyright: reportUnknownVariableType=false
"""Claude-specific image processing.

Handles resizing and compressing images to comply with Claude's vision API
limits before sending them as base64-encoded payloads.

Comparison with official Anthropic docs
(https://docs.anthropic.com/en/docs/build-with-claude/vision):

  Aligned:
    - 5 MB per-image size limit matches the documented API maximum.
    - Output uses the correct base64 source format (type, media_type, data).

  Divergences:
    - Max dimension is set to 7990 px as a safety margin; the API rejects at
      8000 px.  This is intentionally conservative.
    - The docs note that when >20 images are sent in a single request the
      per-image limit drops to 2000x2000 px.  We do not enforce that stricter
      limit here (the app typically sends far fewer images).
    - JPEG conversion drops alpha channels, which is acceptable for website
      screenshots but would degrade transparent PNGs.

  Recommendation:
    The docs recommend resizing to 1568 px on the long edge (~1.15 megapixels)
    for optimal time-to-first-token.  Images above that threshold are resized
    server-side anyway, so sending larger images only adds latency and
    bandwidth cost with no quality benefit.  Consider lowering
    CLAUDE_MAX_IMAGE_DIMENSION to 1568.
"""

import base64
import io
import time

from PIL import Image

# Hard API limit: 5 MB per image (base64-encoded).
CLAUDE_IMAGE_MAX_SIZE = 5 * 1024 * 1024

# API rejects images wider or taller than 8000 px.  We use 7990 as a safety
# margin.  Note: the docs recommend 1568 px for best latency (see module
# docstring).
CLAUDE_MAX_IMAGE_DIMENSION = 7990


def process_image(image_data_url: str) -> tuple[str, str]:
    """Resize / compress a data-URL image to fit Claude's vision limits.

    Returns (media_type, base64_data) suitable for an ``image`` content block.
    """
    media_type = image_data_url.split(";")[0].split(":")[1]
    base64_data = image_data_url.split(",")[1]
    image_bytes = base64.b64decode(base64_data)

    img = Image.open(io.BytesIO(image_bytes))

    is_under_dimension_limit = (
        img.width < CLAUDE_MAX_IMAGE_DIMENSION
        and img.height < CLAUDE_MAX_IMAGE_DIMENSION
    )
    is_under_size_limit = len(base64_data) <= CLAUDE_IMAGE_MAX_SIZE

    if is_under_dimension_limit and is_under_size_limit:
        return (media_type, base64_data)

    start_time = time.time()

    if not is_under_dimension_limit:
        if img.width > img.height:
            new_width = CLAUDE_MAX_IMAGE_DIMENSION
            new_height = int((CLAUDE_MAX_IMAGE_DIMENSION / img.width) * img.height)
        else:
            new_height = CLAUDE_MAX_IMAGE_DIMENSION
            new_width = int((CLAUDE_MAX_IMAGE_DIMENSION / img.height) * img.width)

        img = img.resize((new_width, new_height), Image.DEFAULT_STRATEGY)

    quality = 95
    output = io.BytesIO()
    img = img.convert("RGB")
    img.save(output, format="JPEG", quality=quality)

    while (
        len(base64.b64encode(output.getvalue())) > CLAUDE_IMAGE_MAX_SIZE
        and quality > 10
    ):
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=quality)
        quality -= 5

    end_time = time.time()
    processing_time = end_time - start_time
    print(f"[CLAUDE IMAGE PROCESSING] processing time: {processing_time:.2f} seconds")

    return ("image/jpeg", base64.b64encode(output.getvalue()).decode("utf-8"))
