import base64
import io
import time
from PIL import Image

CLAUDE_IMAGE_MAX_SIZE = 5 * 1024 * 1024
CLAUDE_MAX_IMAGE_DIMENSION = 7900


# Process image so it meets Claude requirements
def process_image(image_data_url: str) -> tuple[str, str]:

    media_type = image_data_url.split(";")[0].split(":")[1]
    base64_data = image_data_url.split(",")[1]

    # If image is already under max size, return as is
    if len(base64_data) <= CLAUDE_IMAGE_MAX_SIZE:
        print("[CLAUDE IMAGE PROCESSING] no processing needed")
        return (media_type, base64_data)

    # Time image processing
    start_time = time.time()

    image_bytes = base64.b64decode(base64_data)
    img = Image.open(io.BytesIO(image_bytes))

    # Check if either dimension exceeds 7900px (Claude disallows >= 8000px)
    if (
        img.width > CLAUDE_MAX_IMAGE_DIMENSION
        or img.height > CLAUDE_MAX_IMAGE_DIMENSION
    ):
        # Calculate the new dimensions while maintaining aspect ratio
        if img.width > img.height:
            new_width = CLAUDE_MAX_IMAGE_DIMENSION
            new_height = int((CLAUDE_MAX_IMAGE_DIMENSION / img.width) * img.height)
        else:
            new_height = CLAUDE_MAX_IMAGE_DIMENSION
            new_width = int((CLAUDE_MAX_IMAGE_DIMENSION / img.height) * img.width)

        # Resize the image
        img = img.resize((new_width, new_height), Image.DEFAULT_STRATEGY)
        print(
            f"[CLAUDE IMAGE PROCESSING] image resized: width = {new_width}, height = {new_height}"
        )

    # Convert and compress as JPEG
    quality = 95
    output = io.BytesIO()
    img = img.convert("RGB")  # Ensure image is in RGB mode for JPEG conversion
    img.save(output, format="JPEG", quality=quality)

    # Reduce quality until image is under max size
    while (
        len(base64.b64encode(output.getvalue())) > CLAUDE_IMAGE_MAX_SIZE
        and quality > 10
    ):
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=quality)
        quality -= 5

    # Log so we know it was modified
    old_size = len(base64_data)
    new_size = len(base64.b64encode(output.getvalue()))
    print(
        f"[CLAUDE IMAGE PROCESSING] image size updated: old size = {old_size} bytes, new size = {new_size} bytes"
    )

    end_time = time.time()
    processing_time = end_time - start_time
    print(f"[CLAUDE IMAGE PROCESSING] processing time: {processing_time:.2f} seconds")

    return ("image/jpeg", base64.b64encode(output.getvalue()).decode("utf-8"))
