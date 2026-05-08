import { strToU8, zipSync } from "fflate";

type AssetCandidate = {
  url: string;
  extensionHint: string;
};

type ExportedAsset = {
  path: string;
  blob: Blob;
};

const IMAGE_ATTRIBUTE_SELECTORS = [
  "img[src]",
  "img[srcset]",
  "source[srcset]",
  "image[href]",
  "image[xlink\\:href]",
  "link[rel~='icon'][href]",
  "link[rel='apple-touch-icon'][href]",
];

const IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/apng": "apng",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isSkippableAssetUrl(url: string) {
  const trimmed = url.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  );
}

function extensionFromMimeType(mimeType: string) {
  return MIME_EXTENSION_MAP[mimeType.toLowerCase().split(";")[0]] ?? "bin";
}

function extensionFromUrl(url: string) {
  if (url.startsWith("data:")) {
    const mimeType = url.match(/^data:([^;,]+)/i)?.[1];
    return mimeType ? extensionFromMimeType(mimeType) : "bin";
  }

  try {
    const parsed = new URL(url, window.location.href);
    const extension = parsed.pathname.split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_EXTENSIONS.has(extension) ? extension : "bin";
  } catch {
    const extension = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_EXTENSIONS.has(extension) ? extension : "bin";
  }
}

function isImageUrl(url: string) {
  const trimmed = url.trim();
  if (isSkippableAssetUrl(trimmed)) return false;
  if (trimmed.startsWith("data:")) {
    return /^data:image\//i.test(trimmed);
  }
  if (trimmed.startsWith("blob:")) return true;
  return extensionFromUrl(trimmed) !== "bin";
}

function addCandidate(candidates: Map<string, AssetCandidate>, rawUrl: string) {
  const url = rawUrl.trim();
  if (!isImageUrl(url) || candidates.has(url)) return;
  candidates.set(url, {
    url,
    extensionHint: extensionFromUrl(url),
  });
}

function extractCssUrls(css: string) {
  const urls: string[] = [];
  const urlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(css)) !== null) {
    urls.push(match[2]);
  }
  return urls;
}

function parseSrcset(srcset: string) {
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function collectAssetCandidates(doc: Document) {
  const candidates = new Map<string, AssetCandidate>();

  doc.querySelectorAll(IMAGE_ATTRIBUTE_SELECTORS.join(",")).forEach((element) => {
    ["src", "href", "xlink:href"].forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (value) addCandidate(candidates, value);
    });

    const srcset = element.getAttribute("srcset");
    if (srcset) {
      parseSrcset(srcset).forEach((url) => addCandidate(candidates, url));
    }
  });

  doc.querySelectorAll("style").forEach((styleElement) => {
    extractCssUrls(styleElement.textContent ?? "").forEach((url) =>
      addCandidate(candidates, url)
    );
  });

  doc.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    extractCssUrls(element.getAttribute("style") ?? "").forEach((url) =>
      addCandidate(candidates, url)
    );
  });

  return Array.from(candidates.values());
}

function resolveFetchUrl(url: string) {
  if (url.startsWith("//")) {
    return `${window.location.protocol}${url}`;
  }
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return new URL(url, window.location.href).toString();
}

async function fetchAsset(candidate: AssetCandidate, assetIndex: number) {
  try {
    const response = await fetch(resolveFetchUrl(candidate.url));
    if (!response.ok) return null;

    const blob = await response.blob();
    const extension =
      candidate.extensionHint !== "bin"
        ? candidate.extensionHint
        : extensionFromMimeType(blob.type);

    return {
      path: `assets/image-${assetIndex + 1}.${extension}`,
      blob,
    };
  } catch (error) {
    console.warn("Skipping asset that could not be downloaded", candidate.url, error);
    return null;
  }
}

function rewriteSrcset(srcset: string, assetPathByUrl: Map<string, string>) {
  return srcset
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const [url, ...descriptors] = trimmed.split(/\s+/);
      const assetPath = assetPathByUrl.get(url);
      if (!assetPath) return part;
      return [assetPath, ...descriptors].join(" ");
    })
    .join(", ");
}

function rewriteCssUrls(css: string, assetPathByUrl: Map<string, string>) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, url) => {
    const assetPath = assetPathByUrl.get(String(url).trim());
    if (!assetPath) return match;
    return `url(${quote}${assetPath}${quote})`;
  });
}

function rewriteHtmlAssets(doc: Document, assetPathByUrl: Map<string, string>) {
  doc.querySelectorAll(IMAGE_ATTRIBUTE_SELECTORS.join(",")).forEach((element) => {
    ["src", "href", "xlink:href"].forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (!value) return;
      const assetPath = assetPathByUrl.get(value.trim());
      if (assetPath) element.setAttribute(attributeName, assetPath);
    });

    const srcset = element.getAttribute("srcset");
    if (srcset) {
      element.setAttribute("srcset", rewriteSrcset(srcset, assetPathByUrl));
    }
  });

  doc.querySelectorAll("style").forEach((styleElement) => {
    styleElement.textContent = rewriteCssUrls(
      styleElement.textContent ?? "",
      assetPathByUrl
    );
  });

  doc.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    element.setAttribute(
      "style",
      rewriteCssUrls(element.getAttribute("style") ?? "", assetPathByUrl)
    );
  });
}

function serializeHtmlDocument(doc: Document) {
  const doctype = doc.doctype ? "<!DOCTYPE html>\n" : "";
  return `${doctype}${doc.documentElement.outerHTML}`;
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function createProjectZip(indexHtml: string, assets: ExportedAsset[]) {
  const files: Record<string, Uint8Array> = {
    "index.html": strToU8(indexHtml),
  };

  await Promise.all(
    assets.map(async (asset) => {
      files[asset.path] = new Uint8Array(await asset.blob.arrayBuffer());
    })
  );

  return new Blob([toArrayBuffer(zipSync(files))], {
    type: "application/zip",
  });
}

export const downloadCode = async (code: string) => {
  const doc = new DOMParser().parseFromString(code, "text/html");
  const candidates = collectAssetCandidates(doc);

  if (candidates.length === 0) {
    downloadBlob(new Blob([code], { type: "text/html" }), "index.html");
    return;
  }

  const fetchedAssets = await Promise.all(
    candidates.map((candidate, index) => fetchAsset(candidate, index))
  );
  const assetPathByUrl = new Map<string, string>();
  const assets: ExportedAsset[] = [];

  fetchedAssets.forEach((asset, index) => {
    if (!asset) return;
    assetPathByUrl.set(candidates[index].url, asset.path);
    assets.push(asset);
  });

  if (assets.length === 0) {
    downloadBlob(new Blob([code], { type: "text/html" }), "index.html");
    return;
  }

  rewriteHtmlAssets(doc, assetPathByUrl);
  const zip = await createProjectZip(serializeHtmlDocument(doc), assets);
  downloadBlob(zip, "screenshot-to-code-export.zip");
};
