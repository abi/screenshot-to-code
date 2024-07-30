export const downloadCode = (code: string) => {
  // Create a blob from the generated code
  const blob = new Blob([code], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  // Create an anchor element and set properties for download
  const a = document.createElement("a");
  a.href = url;
  a.download = "index.html"; // Set the file name for download
  document.body.appendChild(a); // Append to the document
  a.click(); // Programmatically click the anchor to trigger download

  // Clean up by removing the anchor and revoking the Blob URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
