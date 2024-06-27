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

export function getAdjustedCoordinates(
  x: number,
  y: number,
  rect: DOMRect | undefined
) {
  const offsetX = rect ? rect.left : 0;
  const offsetY = rect ? rect.top : 0;

  return { x: x + offsetX, y: y + offsetY };
}
