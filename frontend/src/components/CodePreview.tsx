import { useRef, useEffect } from "react";

interface Props {
  content: string;
}

function CodePreview({ content }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [content]);

  return (
    <div
      ref={scrollRef}
      className="w-full px-2 bg-black text-green-400 whitespace-nowrap flex 
      overflow-x-auto font-mono text-[10px]"
    >
      {content}
    </div>
  );
}

export default CodePreview;
