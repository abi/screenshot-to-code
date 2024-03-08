// Not robust enough to support <html lang='en'> for instance
export function extractHtml(code: string): string {
  const lastHtmlStartIndex = code.lastIndexOf("<html>");
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
