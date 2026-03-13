import fixWebmDuration from "webm-duration-fix";

/**
 * Trim a video blob to the specified time range using captureStream + MediaRecorder.
 * The video plays back in real-time during trimming, so the wait time equals
 * the trimmed duration (max 20s).
 */
export async function trimVideo(
  sourceBlob: Blob,
  startTime: number,
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const duration = endTime - startTime;
  if (duration <= 0) {
    throw new Error("End time must be after start time");
  }

  return new Promise<Blob>((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(sourceBlob);
    video.src = objectUrl;
    video.muted = true; // Mute to allow autoplay
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for trimming"));
    };

    video.onloadedmetadata = () => {
      // Seek to start time
      video.currentTime = startTime;

      video.onseeked = () => {
        // Only handle the initial seek
        video.onseeked = null;

        try {
          // captureStream is not in all TS type definitions
          const stream = (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();
          const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          const chunks: BlobPart[] = [];

          recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = async () => {
            cleanup();
            try {
              const rawBlob = new Blob(chunks, { type: "video/webm" });
              const fixedBlob = await fixWebmDuration(rawBlob);
              resolve(fixedBlob);
            } catch (err) {
              reject(err);
            }
          };

          recorder.onerror = () => {
            cleanup();
            reject(new Error("MediaRecorder error during trim"));
          };

          // Track progress via timeupdate
          video.ontimeupdate = () => {
            const progress = Math.min(
              ((video.currentTime - startTime) / duration) * 100,
              100
            );
            onProgress?.(progress);

            if (video.currentTime >= endTime) {
              video.pause();
              video.ontimeupdate = null;
              recorder.stop();
              stream.getTracks().forEach((t) => t.stop());
            }
          };

          // Start recording and play
          recorder.start();
          video.play().catch((err) => {
            cleanup();
            reject(err);
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      };
    };
  });
}
