import { useState } from "react";
import { Button } from "../ui/button";
import { ScreenRecorderState } from "../../types";
import fixWebmDuration from "webm-duration-fix";
import toast from "react-hot-toast";
import { Stack } from "../../lib/stacks";
import RecordingTimer from "./RecordingTimer";
import VideoTrimmer from "./VideoTrimmer";

interface Props {
  screenRecorderState: ScreenRecorderState;
  setScreenRecorderState: (state: ScreenRecorderState) => void;
  generateCode: (
    referenceImages: string[],
    inputMode: "image" | "video"
  ) => void;
  stack: Stack;
  setStack: (stack: Stack) => void;
}

function ScreenRecorder({
  screenRecorderState,
  setScreenRecorderState,
  generateCode,
  stack,
  setStack,
}: Props) {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

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

      // Accumulate chunks as data is available
      mediaRecorder.ondataavailable = (e: BlobEvent) => chunks.push(e.data);

      // When media recorder is stopped, store the blob for trimming
      mediaRecorder.onstop = async () => {
        const completeBlob = await fixWebmDuration(
          new Blob(chunks, {
            type: options.mimeType,
          })
        );

        setRecordingBlob(completeBlob);
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

  const handleTrimmedVideoReady = (dataUrl: string) => {
    generateCode([dataUrl], "video");
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
            <RecordingTimer />
          </div>
          <Button onClick={stopScreenRecording}>Finish Recording</Button>
        </div>
      )}

      {screenRecorderState === ScreenRecorderState.FINISHED &&
        recordingBlob && (
          <VideoTrimmer
            videoBlob={recordingBlob}
            onTrimmedVideoReady={handleTrimmedVideoReady}
            onRerecord={() =>
              setScreenRecorderState(ScreenRecorderState.INITIAL)
            }
            stack={stack}
            setStack={setStack}
          />
        )}
    </div>
  );
}

export default ScreenRecorder;
