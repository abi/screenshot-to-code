// Cap the element HTML included in the prompt. The model already receives the
// full current code, so the snippet only needs to identify the element.
const MAX_ELEMENT_HTML_LENGTH = 12000;

const MAX_PATH_DEPTH = 6;

function describeNode(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const classAttr = el.getAttribute("class") || "";
  const classes = classAttr.split(/\s+/).filter(Boolean).slice(0, 3);
  return tag + classes.map((c) => `.${c}`).join("");
}

// The outerHTML alone can't identify the element when siblings share identical
// markup (e.g. three "Choose plan" buttons styled by a parent class), so also
// describe where it sits in the DOM.
export function describeElementContext(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && parts.length < MAX_PATH_DEPTH) {
    if (current.tagName.toLowerCase() === "html") break;
    parts.unshift(describeNode(current));
    current = current.parentElement;
  }
  const lines = [`Element location: ${parts.join(" > ")}`];

  const identical = Array.from(
    el.ownerDocument.getElementsByTagName(el.tagName)
  ).filter((other) => other.outerHTML === el.outerHTML);
  if (identical.length > 1) {
    const position = identical.indexOf(el) + 1;
    lines.push(
      `${identical.length} elements on the page share this exact markup; the user selected number ${position} of ${identical.length} in document order. Edit only that one and leave the other copies exactly as they are. Because the markup repeats, do not locate the element by its own markup alone — anchor the edit with unique surrounding context (its parent element or a distinguishing ancestor class from the location path above), or scope a style change through that ancestor. Any search/replace whose search text matches more than one place will hit the wrong copy.`
    );
  }
  return lines.join("\n");
}

export function buildSelectedElementInstruction(
  instruction: string,
  elementHtml: string,
  elementContext?: string
): string {
  const truncated =
    elementHtml.length > MAX_ELEMENT_HTML_LENGTH
      ? elementHtml.slice(0, MAX_ELEMENT_HTML_LENGTH) +
        "\n<!-- truncated; locate the element in the current code -->"
      : elementHtml;

  return `${instruction}

Apply the change to this specific element that the user selected in the preview:

\`\`\`html
${truncated}
\`\`\`
${elementContext ? `\n${elementContext}\n` : ""}
This snippet is the element's outerHTML captured from the rendered page, so it can differ from the source code (for example JSX uses className, Vue templates use directives and interpolations, and frameworks like Ionic or Bootstrap may inject classes or attributes at runtime). Find the code that produces this element and apply the change there, leaving unrelated code untouched.`;
}
