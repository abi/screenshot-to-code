import base64


async def image_to_data_url(filepath: str):
    with open(filepath, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode()
    return f"data:image/png;base64,{encoded_string}"
