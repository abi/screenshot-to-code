export function extractHtml(code: string): string {
  const htmlStartIndex = code.indexOf("<html>");
  return htmlStartIndex !== -1 ? code.slice(htmlStartIndex) : "";
}
