import { Stack } from "../../lib/stacks";

const BASE_PREVIEW_STYLES = `
  <style>
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #ffffff;
      color: #111111;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    img, video, canvas, svg {
      max-width: 100%;
    }
  </style>
`;

const TAILWIND_CDN_SNIPPET = `
  <script>
    window.tailwind = window.tailwind || {};
    window.tailwind.config = {
      darkMode: "class"
    };
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
`;

function hasHtmlTag(code: string) {
  return /<html[\s>]/i.test(code);
}

function hasHeadTag(code: string) {
  return /<head[\s>]/i.test(code);
}

function hasBodyTag(code: string) {
  return /<body[\s>]/i.test(code);
}

function hasTailwindRuntime(code: string) {
  return /cdn\.tailwindcss\.com|@import\s+["']tailwindcss["']|tailwindcss/i.test(code);
}

function injectIntoHead(code: string, snippet: string) {
  if (hasHeadTag(code)) {
    return code.replace(/<head[^>]*>/i, (match) => `${match}\n${snippet}`);
  }

  if (hasHtmlTag(code)) {
    return code.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${snippet}</head>`);
  }

  return `<head>${snippet}</head>${code}`;
}

function ensureBody(code: string) {
  if (hasBodyTag(code)) {
    return code;
  }

  if (hasHtmlTag(code)) {
    return code.replace(/<html[^>]*>/i, (match) => `${match}\n<body>`).concat("\n</body>");
  }

  return `<body>${code}</body>`;
}

function wrapAsDocument(content: string, stack: Stack) {
  const headParts = [BASE_PREVIEW_STYLES];
  if (stack === Stack.HTML_TAILWIND) {
    headParts.push(TAILWIND_CDN_SNIPPET);
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${headParts.join("\n")}
</head>
<body>
${content}
</body>
</html>`;
}

export function renderPreviewDocument(code: string, stack: Stack): string {
  const trimmed = code.trim();
  if (!trimmed) {
    return wrapAsDocument("", stack);
  }

  const previewableStack =
    stack === Stack.REACT_TAILWIND || stack === Stack.VUE_TAILWIND || stack === Stack.IONIC_TAILWIND
      ? Stack.HTML_TAILWIND
      : stack;

  if (!hasHtmlTag(trimmed)) {
    return wrapAsDocument(trimmed, previewableStack);
  }

  let documentHtml = trimmed;
  documentHtml = ensureBody(documentHtml);
  documentHtml = injectIntoHead(documentHtml, BASE_PREVIEW_STYLES);

  if (previewableStack === Stack.HTML_TAILWIND && !hasTailwindRuntime(documentHtml)) {
    documentHtml = injectIntoHead(documentHtml, TAILWIND_CDN_SNIPPET);
  }

  if (!/^<!doctype html>/i.test(documentHtml)) {
    documentHtml = `<!doctype html>\n${documentHtml}`;
  }

  return documentHtml;
}
