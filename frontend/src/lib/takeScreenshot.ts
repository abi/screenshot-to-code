import html2canvas from "html2canvas";

export const takeScreenshot = async (): Promise<string> => {
  const iframeElement = document.querySelector(
    "#preview-desktop"
  ) as HTMLIFrameElement;
  if (!iframeElement?.contentWindow?.document.body) {
    return "";
  }

  const canvas = await html2canvas(iframeElement.contentWindow.document.body);
  const png = canvas.toDataURL("image/png");
  return png;
};
