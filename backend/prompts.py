from support_lenguage import IONIC_PROMPT_SUPPORT

SYSTEM_PROMPT = """
You are an expert {{main_language_name}} developer
You take screenshots of a reference web page from the user, and then build single page apps 
using {{main_language_name}}, {{css_library_name}}, HTML and JS.
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

- Use this script to include {{css_library_name}}: {{css_library_script}}
- You can use {{font_library_name}}
- Font Awesome for icons: {{font_library_script}}

{{support_lenguage}}

Return only the full code in <html></html> tags
Do not include markdown "```" or "```html" at the start or end.
"""

SYSTEM_PROMPT_PARAMS = {
    'main_language_name': 'Tailwind',
    'css_library_name': 'Tailwind',
    'css_library_script': '<script src="https://cdn.tailwindcss.com"></script>',
    'font_library_name': 'Google Fonts',
    'font_library_script': '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"></link>',
}

USER_PROMPT = """
Generate code for a web page that looks exactly like this.
"""
def build_prompt(prompt, params):
    for key, value in params.items():
        placeholder = f"{{{{{key}}}}}"
        prompt = prompt.replace(placeholder, value)
    return prompt

def add_support_lenguages(prompt):
    support_lenguage = "\n".join([IONIC_PROMPT_SUPPORT])
    prompt = build_prompt(prompt, {'support_lenguage': support_lenguage })
    return prompt

def get_prompt(prompt, params = {}):
    params_template = {**SYSTEM_PROMPT_PARAMS, **params}
    
    prompt_template = build_prompt(prompt, params_template)
    prompt_template = add_support_lenguages(prompt_template)

    return prompt_template

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
        # TODO: Pass params from settings frotend
        {"role": "system", "content": get_prompt(SYSTEM_PROMPT)},
        {
            "role": "user",
            "content": content,
        },
    ]
