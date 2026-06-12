// Devtools-style indicators for select-and-edit mode, rendered as
// pointer-events-none overlays (plus a crosshair cursor style) inside the
// preview iframe's document, so page elements are never mutated and a
// selected element's captured outerHTML stays clean. All nodes attach
// outside <body>, which also keeps body-level selections clean.
//
// Two overlay kinds with deliberately distinct looks:
// - "hover": light ring + soft fill + tag chip — what you're pointing at
// - "selection": solid offset ring + stronger fill + "✓ tag" chip — what
//   is locked in for the edit
const CURSOR_STYLE_ID = "__s2c-select-cursor";

type OverlayKind = "hover" | "selection";

const OVERLAY_IDS: Record<OverlayKind, string> = {
  hover: "__s2c-hover-overlay",
  selection: "__s2c-selection-overlay",
};

// The selection ring sits 3px outside the element so the two rings stay
// readable when the selected element is also hovered.
const SELECTION_INSET = 3;

const OVERLAY_STYLES: Record<OverlayKind, Partial<CSSStyleDeclaration>> = {
  hover: {
    zIndex: "2147483646",
    border: "1.5px solid rgba(124, 58, 237, 0.95)",
    background: "rgba(139, 92, 246, 0.09)",
    boxShadow: "0 0 0 3px rgba(139, 92, 246, 0.15)",
  },
  selection: {
    zIndex: "2147483645",
    border: "2.5px solid rgb(109, 40, 217)",
    background: "rgba(124, 58, 237, 0.16)",
    boxShadow:
      "0 0 0 2px rgba(255, 255, 255, 0.9), 0 2px 12px rgba(109, 40, 217, 0.45)",
  },
};

const LABEL_STYLES: Record<OverlayKind, Partial<CSSStyleDeclaration>> = {
  hover: {
    background: "rgb(124, 58, 237)",
  },
  selection: {
    background: "rgb(91, 33, 182)",
  },
};

function ensureOverlay(doc: Document, kind: OverlayKind): HTMLElement {
  let overlay = doc.getElementById(OVERLAY_IDS[kind]);
  if (overlay) return overlay;

  overlay = doc.createElement("div");
  overlay.id = OVERLAY_IDS[kind];
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    borderRadius: "4px",
    transition:
      "top 90ms ease-out, left 90ms ease-out, width 90ms ease-out, height 90ms ease-out",
    display: "none",
    ...OVERLAY_STYLES[kind],
  });

  const label = doc.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    left: "-2px",
    padding: "2px 7px",
    color: "#fff",
    font: "600 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace",
    borderRadius: "4px",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.25)",
    ...LABEL_STYLES[kind],
  });
  overlay.appendChild(label);

  // Outside <body> so a body-level selection never captures the overlay.
  doc.documentElement.appendChild(overlay);
  return overlay;
}

function showOverlay(element: HTMLElement, kind: OverlayKind) {
  const doc = element.ownerDocument;
  if (!doc || !doc.documentElement) return;
  if (
    element === doc.documentElement ||
    element.id === OVERLAY_IDS.hover ||
    element.id === OVERLAY_IDS.selection
  ) {
    return;
  }

  const overlay = ensureOverlay(doc, kind);
  const rect = element.getBoundingClientRect();
  const inset = kind === "selection" ? SELECTION_INSET : 0;
  overlay.style.display = "block";
  overlay.style.top = `${rect.top - inset}px`;
  overlay.style.left = `${rect.left - inset}px`;
  overlay.style.width = `${rect.width + inset * 2}px`;
  overlay.style.height = `${rect.height + inset * 2}px`;

  const label = overlay.firstChild as HTMLElement | null;
  if (label) {
    const tag = `<${element.tagName.toLowerCase()}>`;
    label.textContent = kind === "selection" ? `✓ ${tag}` : tag;
    // Flip the label inside the box when the element touches the top edge.
    label.style.top = rect.top - inset > 26 ? "-24px" : "3px";
  }
}

function hideOverlay(doc: Document | null | undefined, kind: OverlayKind) {
  const overlay = doc?.getElementById(OVERLAY_IDS[kind]);
  if (overlay) overlay.style.display = "none";
}

function removeOverlay(doc: Document | null | undefined, kind: OverlayKind) {
  doc?.getElementById(OVERLAY_IDS[kind])?.remove();
}

export function showHoverOverlay(element: HTMLElement) {
  showOverlay(element, "hover");
}

export function hideHoverOverlay(doc: Document | null | undefined) {
  hideOverlay(doc, "hover");
}

export function removeHoverOverlay(doc: Document | null | undefined) {
  removeOverlay(doc, "hover");
}

export function showSelectionOverlay(element: HTMLElement) {
  showOverlay(element, "selection");
}

export function hideSelectionOverlay(doc: Document | null | undefined) {
  hideOverlay(doc, "selection");
}

export function removeSelectionOverlay(doc: Document | null | undefined) {
  removeOverlay(doc, "selection");
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
