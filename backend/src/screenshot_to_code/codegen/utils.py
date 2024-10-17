import re


def extract_html_content(text: str):
    # Use regex to find content within <html> tags and include the tags themselves
    match = re.search(r"(<html.*?>.*?</html>)", text, re.DOTALL)
    if match:
        return match.group(1)
    else:
        # Otherwise, we just send the previous HTML over
        print(
            "[HTML Extraction] No <html> tags found in the generated content: " + text
        )
        return text
