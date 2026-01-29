// Extract HTML content, supporting <html> tags with attributes like <html lang="en">
export function extractHtml(code: string): string {
  // Use regex to find <html> tag with optional attributes
  const htmlStartMatch = code.match(/<html[^>]*>/i);
  if (!htmlStartMatch) {
    return "";
  }

  const lastHtmlStartIndex = code.lastIndexOf(htmlStartMatch[0]);
  let htmlEndIndex = code.indexOf("</html>", lastHtmlStartIndex);

  if (lastHtmlStartIndex !== -1) {
    // If "</html>" is found, adjust htmlEndIndex to include the "</html>" tag
    if (htmlEndIndex !== -1) {
      htmlEndIndex += "</html>".length;
      return code.slice(lastHtmlStartIndex, htmlEndIndex);
    }
    // If "</html>" is not found, return the rest of the string starting from the last "<html>"
    return code.slice(lastHtmlStartIndex);
  }
  return "";
}
