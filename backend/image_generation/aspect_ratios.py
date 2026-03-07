from typing import Literal, cast


AspectRatio = Literal[
    "1:1",
    "16:9",
    "9:16",
    "3:2",
    "2:3",
    "4:3",
    "3:4",
    "5:4",
    "4:5",
    "21:9",
    "9:21",
]

SUPPORTED_ASPECT_RATIOS: tuple[AspectRatio, ...] = (
    "1:1",
    "16:9",
    "9:16",
    "3:2",
    "2:3",
    "4:3",
    "3:4",
    "5:4",
    "4:5",
    "21:9",
    "9:21",
)
DEFAULT_ASPECT_RATIO: AspectRatio = "1:1"

DalleImageSize = Literal["1024x1024", "1792x1024", "1024x1792"]


def is_supported_aspect_ratio(value: object) -> bool:
    return isinstance(value, str) and value in SUPPORTED_ASPECT_RATIOS


def normalize_aspect_ratio(value: object) -> AspectRatio:
    if is_supported_aspect_ratio(value):
        return cast(AspectRatio, value)
    return DEFAULT_ASPECT_RATIO


def aspect_ratio_to_dalle_size(aspect_ratio: AspectRatio) -> DalleImageSize:
    if aspect_ratio == "1:1":
        return "1024x1024"

    width, height = (int(part) for part in aspect_ratio.split(":"))
    return "1792x1024" if width > height else "1024x1792"
