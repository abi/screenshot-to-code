// Cap the element HTML included in the prompt. The model already receives the
// full current code, so the snippet only needs to identify the element.
const MAX_ELEMENT_HTML_LENGTH = 12000;

export function removeHighlight(element: HTMLElement) {
  element.style.outline = element.dataset.s2cPrevOutline ?? "";
  element.style.backgroundColor = element.dataset.s2cPrevBackgroundColor ?? "";
  delete element.dataset.s2cPrevOutline;
  delete element.dataset.s2cPrevBackgroundColor;
  // Avoid leaving an empty style attribute behind so the captured outerHTML
  // matches the source markup as closely as possible.
  if (!element.getAttribute("style")) {
    element.removeAttribute("style");
  }
  return element;
}

export function addHighlight(element: HTMLElement) {
  if (element.dataset.s2cPrevOutline === undefined) {
    element.dataset.s2cPrevOutline = element.style.outline;
    element.dataset.s2cPrevBackgroundColor = element.style.backgroundColor;
  }
  element.style.outline = "2px dashed #1846db";
  element.style.backgroundColor = "#bfcbf5";
  return element;
}

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
