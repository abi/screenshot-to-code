export function downloadBlob(blob: Blob) {
  // Create a URL for the blob object
  const videoURL = URL.createObjectURL(blob);

  // Create a temporary anchor element and trigger the download
  const a = document.createElement("a");
  a.href = videoURL;
  a.download = "recording.webm";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clear object URL
  URL.revokeObjectURL(videoURL);
}

export function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error("FileReader did not return a result."));
      }
    };
    reader.onerror = () =>
      reject(new Error("FileReader encountered an error."));
    reader.readAsDataURL(blob);
  });
}

export function getVideoDurationSecondsFromBlob(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(blob);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (Number.isFinite(duration)) {
        resolve(duration);
      } else {
        reject(new Error("Unable to read video duration"));
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video metadata"));
    };

    video.src = objectUrl;
  });
}
