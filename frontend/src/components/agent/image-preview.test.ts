import { getEditImageSourceUrls } from "./image-preview";

describe("getEditImageSourceUrls", () => {
  test("uses complete input URLs instead of truncated output summaries", () => {
    const sourceUrl = `https://images.example.com/${"source-path/".repeat(12)}image.png`;
    const summarizedUrl = `${sourceUrl.slice(0, 100)}...`;

    expect(
      getEditImageSourceUrls(
        { image_urls: [sourceUrl] },
        { image: { image_urls: [summarizedUrl] } }
      )
    ).toEqual([sourceUrl]);
  });

  test("falls back to output URLs for events without source URLs in the input", () => {
    const sourceUrl = "https://images.example.com/source.png";

    expect(
      getEditImageSourceUrls(
        { prompt: "Make it brighter" },
        { image: { image_urls: [sourceUrl] } }
      )
    ).toEqual([sourceUrl]);
  });
});
