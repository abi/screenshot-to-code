import { useEffect, useState } from "react";
import { MAX_VIDEO_DURATION_SECONDS } from "./constants";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function RecordingTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const overLimit = elapsed > MAX_VIDEO_DURATION_SECONDS;

  return (
    <span className={overLimit ? "text-amber-500" : ""}>
      {formatTime(elapsed)}
      {overLimit && (
        <span className="text-xs ml-1">(over {MAX_VIDEO_DURATION_SECONDS}s)</span>
      )}
    </span>
  );
}

export default RecordingTimer;
