// Devtools-style hover indicator for select-and-edit mode. Rendered as a
// pointer-events-none overlay (plus a crosshair cursor style) inside the
// preview iframe's document, so hovered elements are never mutated and a
// selected element's captured outerHTML stays clean. Both nodes attach
// outside <body>, which also keeps body-level selections clean.
const OVERLAY_ID = "__s2c-hover-overlay";
const LABEL_ID = "__s2c-hover-overlay-label";
const CURSOR_STYLE_ID = "__s2c-select-cursor";

function ensureOverlay(doc: Document): HTMLElement {
  let overlay = doc.getElementById(OVERLAY_ID);
  if (overlay) return overlay;

  overlay = doc.createElement("div");
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    zIndex: "2147483646",
    border: "1.5px solid rgba(124, 58, 237, 0.95)",
    borderRadius: "4px",
    background: "rgba(139, 92, 246, 0.09)",
    boxShadow: "0 0 0 3px rgba(139, 92, 246, 0.15)",
    transition:
      "top 90ms ease-out, left 90ms ease-out, width 90ms ease-out, height 90ms ease-out",
    display: "none",
  });

  const label = doc.createElement("div");
  label.id = LABEL_ID;
  Object.assign(label.style, {
    position: "absolute",
    left: "-1.5px",
    padding: "2px 7px",
    background: "rgb(124, 58, 237)",
    color: "#fff",
    font: "600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
    borderRadius: "4px",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.25)",
  });
  overlay.appendChild(label);

  // Outside <body> so a body-level selection never captures the overlay.
  doc.documentElement.appendChild(overlay);
  return overlay;
}

export function showHoverOverlay(element: HTMLElement) {
  const doc = element.ownerDocument;
  if (!doc || !doc.documentElement) return;
  if (element === doc.documentElement || element.id === OVERLAY_ID) return;

  const overlay = ensureOverlay(doc);
  const rect = element.getBoundingClientRect();
  overlay.style.display = "block";
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  const label = doc.getElementById(LABEL_ID);
  if (label) {
    label.textContent = `<${element.tagName.toLowerCase()}>`;
    // Flip the label inside the box when the element touches the top edge.
    label.style.top = rect.top > 26 ? "-24px" : "3px";
  }
}

export function hideHoverOverlay(doc: Document | null | undefined) {
  const overlay = doc?.getElementById(OVERLAY_ID);
  if (overlay) overlay.style.display = "none";
}

export function removeHoverOverlay(doc: Document | null | undefined) {
  doc?.getElementById(OVERLAY_ID)?.remove();
}

// Crosshair cursor everywhere in the page while selecting, overriding
// per-element cursors (buttons, links) that would otherwise flicker.
export function applySelectModeCursor(doc: Document | null | undefined) {
  if (!doc || doc.getElementById(CURSOR_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = CURSOR_STYLE_ID;
  style.textContent = "* { cursor: crosshair !important; }";
  (doc.head ?? doc.documentElement)?.appendChild(style);
}

export function removeSelectModeCursor(doc: Document | null | undefined) {
  doc?.getElementById(CURSOR_STYLE_ID)?.remove();
}
