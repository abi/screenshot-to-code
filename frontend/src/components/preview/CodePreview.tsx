import { useRef, useEffect, memo, useMemo } from "react";
import { useThrottle } from "../../hooks/useThrottle";

// Only display the last N characters to prevent DOM performance issues with large files
const MAX_DISPLAY_CHARS = 5000;
// Throttle code preview updates during generation
const PREVIEW_THROTTLE_MS = 100;

interface Props {
  code: string;
}

function CodePreview({ code }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Throttle updates to reduce re-renders during rapid code generation
  const throttledCode = useThrottle(code, PREVIEW_THROTTLE_MS);

  // Only show the last portion of the code for performance
  const displayCode = useMemo(() => {
    if (throttledCode.length <= MAX_DISPLAY_CHARS) {
      return throttledCode;
    }
    // Show ellipsis and the last N characters
    return "..." + throttledCode.slice(-MAX_DISPLAY_CHARS);
  }, [throttledCode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [displayCode]);

  return (
    <div
      ref={scrollRef}
      className="w-full px-2 bg-black text-green-400 whitespace-nowrap flex
      overflow-x-auto font-mono text-[10px] my-4"
    >
      {displayCode}
    </div>
  );
}

export default memo(CodePreview);
