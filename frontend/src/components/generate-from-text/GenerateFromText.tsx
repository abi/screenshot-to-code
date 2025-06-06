import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import toast from "react-hot-toast";

interface GenerateFromTextProps {
  doCreateFromText: (text: string) => void;
}

function GenerateFromText({ doCreateFromText }: GenerateFromTextProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

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
    <div className="mt-4">
      {!isOpen ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setIsOpen(true)}>
            Generate from text prompt [BETA]
          </Button>
        </div>
      ) : (
        <>
          <Textarea
            ref={textareaRef}
            rows={2}
            placeholder="A SaaS admin dashboard with charts and user management"
            className="w-full mb-4"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Press Cmd/Ctrl + Enter to generate
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>Generate</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GenerateFromText;
