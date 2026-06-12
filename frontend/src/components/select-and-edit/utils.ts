// Cap the element HTML included in the prompt. The model already receives the
// full current code, so the snippet only needs to identify the element.
const MAX_ELEMENT_HTML_LENGTH = 12000;

export function buildSelectedElementInstruction(
  instruction: string,
  elementHtml: string
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

This snippet is the element's outerHTML captured from the rendered page, so it can differ from the source code (for example JSX uses className, Vue templates use directives and interpolations, and frameworks like Ionic or Bootstrap may inject classes or attributes at runtime). Find the code that produces this element and apply the change there, leaving unrelated code untouched.`;
}
