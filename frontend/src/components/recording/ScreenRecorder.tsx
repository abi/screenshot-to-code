import { useState } from "react";
import { Button } from "../ui/button";
import { ScreenRecorderState } from "../../types";
import { blobToBase64DataUrl } from "./utils";
import fixWebmDuration from "webm-duration-fix";
import toast from "react-hot-toast";

interface Props {
  screenRecorderState: ScreenRecorderState;
  setScreenRecorderState: (state: ScreenRecorderState) => void;
  generateCode: (
    referenceImages: string[],
    inputMode: "image" | "video"
  ) => void;
}

function ScreenRecorder({
  screenRecorderState,
  setScreenRecorderState,
  generateCode,
}: Props) {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [screenRecordingDataUrl, setScreenRecordingDataUrl] = useState<
    string | null
  >(null);

  const startScreenRecording = async () => {
    try {
      // Get the screen recording stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: true },
      });
      setMediaStream(stream);

      // TODO: Test across different browsers
      // Create the media recorder
      const options = { mimeType: "video/webm" };
      const mediaRecorder = new MediaRecorder(stream, options);
      setMediaRecorder(mediaRecorder);

      const chunks: BlobPart[] = [];

      // Accumalate chunks as data is available
      mediaRecorder.ondataavailable = (e: BlobEvent) => chunks.push(e.data);

      // When media recorder is stopped, create a data URL
      mediaRecorder.onstop = async () => {
        // TODO: Do I need to fix duration if it's not a webm?
        const completeBlob = await fixWebmDuration(
          new Blob(chunks, {
            type: options.mimeType,
          })
        );

        const dataUrl = await blobToBase64DataUrl(completeBlob);

        setScreenRecordingDataUrl(dataUrl);
        setScreenRecorderState(ScreenRecorderState.FINISHED);
      };

      // Start recording
      mediaRecorder.start();
      setScreenRecorderState(ScreenRecorderState.RECORDING);
    } catch (error) {
      toast.error("Could not start screen recording");
      throw error;
    }
  };

  const stopScreenRecording = () => {
    // Stop the recorder
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }

    // Stop the screen sharing stream
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
  };

  const kickoffGeneration = () => {
    if (screenRecordingDataUrl) {
      generateCode([screenRecordingDataUrl], "video");
    } else {
      toast.error("Screen recording does not exist. Please try again.");
      throw new Error("No screen recording data url");
    }
  };

  return (
    <div className="flex items-center justify-center my-3">
      {screenRecorderState === ScreenRecorderState.INITIAL && (
        <Button onClick={startScreenRecording}>Record Screen</Button>
      )}

      {screenRecorderState === ScreenRecorderState.RECORDING && (
        <div className="flex items-center flex-col gap-y-4">
          <div className="flex items-center mr-2 text-xl gap-x-1">
            <span className="block h-10 w-10 bg-red-600 rounded-full mr-1 animate-pulse"></span>
            <span>Recording...</span>
          </div>
          <Button onClick={stopScreenRecording}>Finish Recording</Button>
        </div>
      )}

      {screenRecorderState === ScreenRecorderState.FINISHED && (
        <div className="flex items-center flex-col gap-y-4">
          <div className="flex items-center mr-2 text-xl gap-x-1">
            <span>Screen Recording Captured.</span>
          </div>
          {screenRecordingDataUrl && (
            <video
              muted
              autoPlay
              loop
              className="w-[340px] border border-gray-200 rounded-md"
              src={screenRecordingDataUrl}
            />
          )}
          <div className="flex gap-x-2">
            <Button
              variant="secondary"
              onClick={() =>
                setScreenRecorderState(ScreenRecorderState.INITIAL)
              }
            >
              Re-record
            </Button>
            <Button onClick={kickoffGeneration}>Generate</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreenRecorder;
