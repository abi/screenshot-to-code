export function removeHighlight(element: HTMLElement) {
  element.style.outline = "";
  element.style.backgroundColor = "";
  return element;
}

export function addHighlight(element: HTMLElement) {
  element.style.outline = "2px dashed #1846db";
  element.style.backgroundColor = "#bfcbf5";
  return element;
}
