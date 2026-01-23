import re


def extract_html_content(text: str):
    # First, strip markdown code fences if present
    text = re.sub(r'^```html?\s*\n?', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n?```\s*$', '', text, flags=re.MULTILINE)

    # Try to find DOCTYPE + html tags together
    match_with_doctype = re.search(
        r"(<!DOCTYPE\s+html[^>]*>.*?<html.*?>.*?</html>)", text, re.DOTALL | re.IGNORECASE
    )
    if match_with_doctype:
        extracted = match_with_doctype.group(1)
        print(f"[HTML Extraction] Successfully extracted {len(extracted)} chars of HTML (with DOCTYPE)")
        return extracted

    # Fall back to just <html> tags
    match = re.search(r"(<html.*?>.*?</html>)", text, re.DOTALL)
    if match:
        extracted = match.group(1)
        print(f"[HTML Extraction] Successfully extracted {len(extracted)} chars of HTML")
        return extracted
    else:
        # Otherwise, we just send the previous HTML over
        print(
            "[HTML Extraction] No <html> tags found in the generated content (length: "
            + str(len(text)) + " chars). First 500 chars: " + text[:500]
        )
        return text
