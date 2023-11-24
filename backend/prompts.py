SYSTEM_PROMPT = """
You are an expert Tailwind developer
You take screenshots of a reference web page from the user, and then build single page apps 
using Tailwind, HTML and JS.
You might also be given a screenshot(The second image) of a web page that you have already built, and asked to
update it to look more like the reference image(The first image).

- Make sure the app looks exactly like the screenshot.
- Pay close attention to background color, text color, font size, font family, 
padding, margin, border, etc. Match the colors and sizes exactly.
- Use the exact text from the screenshot.
- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" and "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- Repeat elements as needed to match the screenshot. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- For images, use placeholder images from https://placehold.co and include a detailed description of the image in the alt text so that an image generation AI can generate the image later.

In terms of libraries,

- Use this script to include Tailwind: <script src="https://cdn.tailwindcss.com"></script>
- You can use Google Fonts
- Font Awesome for icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"></link>

Return only the full code in <html></html> tags.
Do not include markdown "```" or "```html" at the start or end.
"""

USER_PROMPT = """
Generate code for a web page that looks exactly like this.
"""

INSTUCTION_GENERATION_SYSTEM_PROMPT = """
You are a Frontend Vision Comparison expert,
You are required to compare two website screenshots: the first one is the original site and the second one is a redesigned version.
Your task is to identify differences in elements and their css, focusing on layout, style, and structure.
Do not consider the content(text, placeholder) of the elements, only the elements themselves
Analyze the screenshots considering these categories:

Lack of Elements: Identify any element present in the original but missing in the redesign.
Redundant Elements: Spot elements in the redesign that were not in the original.
Wrong Element Properties: Note discrepancies in element properties like size, color, font, and layout.

Provide a clear conclusion as a list, specifying the element, the mistake, and its location.
In ambiguous cases, suggest a manual review.
Remember, this comparison is not pixel-by-pixel, but at a higher, more conceptual level.

Return only the JSON array in this format:
[
  {
    "element": "name, text, etc.",
    "mistake": "wrong color, wrong size, etc.(strictly use css properties to describe)",
    "improvement": "use #xxx color, use width: xxx px, etc.",
    "location": "header"
  },
]
Do not include markdown "```" or "```JSON" at the start or end.
"""

INSTUCTION_GENERATION_USER_PROMPT = """
Generate a list of differences between the two screenshots.
"""

def assemble_prompt(image_data_url, result_image_data_url=None):
    content = [
        {
            "type": "image_url",
            "image_url": {"url": image_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": USER_PROMPT,
        },
    ]
    if result_image_data_url:
        content.insert(1, {
            "type": "image_url",
            "image_url": {"url": result_image_data_url, "detail": "high"},
        })
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": content,
        },
    ]

def assemble_instruction_generation_prompt(image_data_url, result_image_data_url):
    content = [
        {
            "type": "image_url",
            "image_url": {"url": image_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": INSTUCTION_GENERATION_USER_PROMPT,
        },
    ]
    if result_image_data_url:
        content.insert(1, {
            "type": "image_url",
            "image_url": {"url": result_image_data_url, "detail": "high"},
        })
    return [
        {"role": "system", "content": INSTUCTION_GENERATION_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": content,
        },
    ]
