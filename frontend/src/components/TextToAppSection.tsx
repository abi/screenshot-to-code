import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import toast from "react-hot-toast";

interface Props {
  doCreateFromText: (text: string) => void;
}

export function TextToAppSection({ doCreateFromText }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleGenerate = () => {
    if (text.trim() === "") {
      toast.error("Please enter a prompt to generate from");
      return;
    }
    doCreateFromText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col gap-y-4">
      <Textarea
        ref={textareaRef}
        rows={6}
        placeholder="Describe your app in detail... (e.g., A SaaS admin dashboard with charts and user management)"
        className="w-full resize-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Tip: Be as specific as possible for better results.
        </span>
        <Button onClick={handleGenerate}>Generate</Button>
      </div>
    </div>
  );
}
