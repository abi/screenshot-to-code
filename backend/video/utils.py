import base64


def extract_tag_content(tag: str, text: str) -> str:
    """
    Extracts content for a given tag from the provided text.

    :param tag: The tag to search for.
    :param text: The text to search within.
    :return: The content found within the tag, if any.
    """
    tag_start = f"<{tag}>"
    tag_end = f"</{tag}>"
    start_idx = text.find(tag_start)
    end_idx = text.find(tag_end, start_idx)
    if start_idx != -1 and end_idx != -1:
        return text[start_idx : end_idx + len(tag_end)]
    return ""


def get_video_bytes_and_mime_type(video_data_url: str) -> tuple[bytes, str]:
    video_encoded_data = video_data_url.split(",")[1]
    video_bytes = base64.b64decode(video_encoded_data)
    mime_type = video_data_url.split(";")[0].split(":")[1]
    return video_bytes, mime_type
