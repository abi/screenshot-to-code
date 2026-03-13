export const downloadCode = (code: string, filename: string = "index.html") => {
  const mimeType = filename.endsWith(".jsx") || filename.endsWith(".tsx")
    ? "text/javascript"
    : "text/html";
  const blob = new Blob([code], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
