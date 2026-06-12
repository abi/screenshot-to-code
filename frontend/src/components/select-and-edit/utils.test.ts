import {
  buildSelectedElementInstruction,
  describeElementContext,
} from "./utils";

// Minimal stand-in for a DOM element; jest runs in the node environment.
interface FakeElement {
  tagName: string;
  outerHTML: string;
  parentElement: FakeElement | null;
  ownerDocument: { getElementsByTagName: (tag: string) => FakeElement[] };
  getAttribute: (name: string) => string | null;
}

function fakeElement(tag: string, classAttr: string, outerHTML = ""): FakeElement {
  return {
    tagName: tag.toUpperCase(),
    outerHTML,
    parentElement: null,
    ownerDocument: { getElementsByTagName: () => [] },
    getAttribute: (name) => (name === "class" && classAttr ? classAttr : null),
  };
}

function asElement(el: FakeElement): Element {
  return el as unknown as Element;
}

describe("describeElementContext", () => {
  function buildPricingPage() {
    const body = fakeElement("body", "");
    const grid = fakeElement("div", "pricing-grid");
    const card = fakeElement("div", "pricing-card featured");
    const anchorHtml = '<a href="#" class="btn">Choose plan</a>';
    const basicBtn = fakeElement("a", "btn", anchorHtml);
    const proBtn = fakeElement("a", "btn", anchorHtml);
    const enterpriseBtn = fakeElement("a", "btn", anchorHtml);
    grid.parentElement = body;
    card.parentElement = grid;
    proBtn.parentElement = card;
    const doc = {
      getElementsByTagName: () => [basicBtn, proBtn, enterpriseBtn],
    };
    [basicBtn, proBtn, enterpriseBtn].forEach((el) => {
      el.ownerDocument = doc;
    });
    return { proBtn };
  }

  it("builds an ancestor path with classes", () => {
    const { proBtn } = buildPricingPage();
    const context = describeElementContext(asElement(proBtn));
    expect(context).toContain(
      "Element location: body > div.pricing-grid > div.pricing-card.featured > a.btn"
    );
  });

  it("notes the position among identical elements", () => {
    const { proBtn } = buildPricingPage();
    const context = describeElementContext(asElement(proBtn));
    expect(context).toContain("3 elements on the page share this exact markup");
    expect(context).toContain("number 2 of 3");
  });

  it("omits the duplicate note when the markup is unique", () => {
    const heading = fakeElement("h1", "title", "<h1 class=\"title\">Hi</h1>");
    heading.ownerDocument = { getElementsByTagName: () => [heading] };
    const context = describeElementContext(asElement(heading));
    expect(context).toContain("Element location: h1.title");
    expect(context).not.toContain("share this exact markup");
  });
});

describe("buildSelectedElementInstruction", () => {
  it("includes the instruction and the element html", () => {
    const result = buildSelectedElementInstruction(
      "Make the button red",
      '<button class="btn">Buy</button>'
    );
    expect(result).toContain("Make the button red");
    expect(result).toContain('<button class="btn">Buy</button>');
    expect(result).toContain("selected in the preview");
  });

  it("mentions that the snippet is rendered DOM, not source", () => {
    const result = buildSelectedElementInstruction(
      "Center it",
      "<div>x</div>"
    );
    expect(result).toContain("outerHTML captured from the rendered page");
  });

  it("truncates very large element html", () => {
    const hugeHtml = `<div>${"a".repeat(20000)}</div>`;
    const result = buildSelectedElementInstruction("Shrink it", hugeHtml);
    expect(result).toContain("truncated");
    expect(result.length).toBeLessThan(hugeHtml.length);
  });

  it("does not truncate small element html", () => {
    const result = buildSelectedElementInstruction(
      "Bold it",
      "<span>hello</span>"
    );
    expect(result).not.toContain("truncated");
  });

  it("includes the element context when provided", () => {
    const result = buildSelectedElementInstruction(
      "Make it red",
      '<a class="btn">Go</a>',
      "Element location: body > div.card > a.btn"
    );
    expect(result).toContain("Element location: body > div.card > a.btn");
  });

  it("omits the context block when not provided", () => {
    const result = buildSelectedElementInstruction(
      "Make it red",
      '<a class="btn">Go</a>'
    );
    expect(result).not.toContain("Element location:");
  });
});
