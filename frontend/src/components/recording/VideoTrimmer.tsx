import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { MAX_VIDEO_DURATION_SECONDS } from "./constants";
import { trimVideo } from "./trimUtils";
import { blobToBase64DataUrl } from "./utils";
import OutputSettingsSection from "../settings/OutputSettingsSection";
import { Stack } from "../../lib/stacks";
import toast from "react-hot-toast";

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`;
}

interface Props {
  videoBlob: Blob;
  onTrimmedVideoReady: (dataUrl: string) => void;
  onRerecord: () => void;
  stack: Stack;
  setStack: (stack: Stack) => void;
}

function VideoTrimmer({
  videoBlob,
  onTrimmedVideoReady,
  onRerecord,
  stack,
  setStack,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);

  const selectedDuration = trimRange[1] - trimRange[0];
  const isOverLimit = selectedDuration > MAX_VIDEO_DURATION_SECONDS;
  const needsTrim =
    videoDuration > 0 &&
    (trimRange[0] > 0.1 || trimRange[1] < videoDuration - 0.1);

  // Create object URL on mount
  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  // Read video duration once metadata loads
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    const dur = video.duration;
    setVideoDuration(dur);
    setTrimRange([0, Math.min(dur, MAX_VIDEO_DURATION_SECONDS)]);
  }, []);

  // Loop playback within the trim range
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= trimRange[1]) {
        video.currentTime = trimRange[0];
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [trimRange]);

  // When trim range changes, seek video to the start of the range
  const handleSliderChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setTrimRange(newRange);

    const video = videoRef.current;
    if (video) {
      video.currentTime = newRange[0];
    }
  };

  const handleGenerate = async () => {
    if (isOverLimit) return;

    setIsTrimming(true);
    setTrimProgress(0);

    try {
      let finalBlob: Blob;

      if (!needsTrim) {
        // No trimming needed — use original blob
        finalBlob = videoBlob;
      } else {
        finalBlob = await trimVideo(
          videoBlob,
          trimRange[0],
          trimRange[1],
          (progress) => setTrimProgress(progress)
        );
      }

      const dataUrl = await blobToBase64DataUrl(finalBlob);
      onTrimmedVideoReady(dataUrl);
    } catch {
      toast.error("Failed to trim video. Please try again.");
      setIsTrimming(false);
    }
  };

  if (!objectUrl) return null;

  return (
    <div className="flex items-center flex-col gap-y-4 w-full max-w-md">
      <div className="text-xl">
        {isTrimming ? "Trimming video..." : "Trim your recording"}
      </div>

      {/* Video preview */}
      <video
        ref={videoRef}
        muted
        autoPlay
        loop
        className="w-full border border-gray-200 rounded-md"
        src={objectUrl}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Trim controls */}
      {videoDuration > 0 && !isTrimming && (
        <div className="w-full space-y-2">
          <Slider
            value={trimRange}
            min={0}
            max={videoDuration}
            step={0.1}
            onValueChange={handleSliderChange}
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTimestamp(trimRange[0])}</span>
            <span
              className={
                isOverLimit ? "text-red-500 font-medium" : "text-foreground"
              }
            >
              {selectedDuration.toFixed(1)}s / {MAX_VIDEO_DURATION_SECONDS}s max
            </span>
            <span>{formatTimestamp(trimRange[1])}</span>
          </div>

          {isOverLimit && (
            <p className="text-xs text-red-500 text-center">
              Selection exceeds {MAX_VIDEO_DURATION_SECONDS}s limit. Adjust the
              handles to shorten it.
            </p>
          )}
        </div>
      )}

      {/* Trimming progress */}
      {isTrimming && (
        <div className="w-full space-y-2">
          <Progress value={trimProgress} />
          <p className="text-xs text-muted-foreground text-center">
            Processing... {Math.round(trimProgress)}%
          </p>
        </div>
      )}

      {/* Settings and actions */}
      {!isTrimming && (
        <>
          <div className="w-full">
            <OutputSettingsSection stack={stack} setStack={setStack} />
          </div>
          <div className="flex gap-x-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={onRerecord}>
              Re-record
            </Button>
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={isOverLimit || videoDuration === 0}
            >
              {needsTrim ? "Trim & Generate" : "Generate"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default VideoTrimmer;
