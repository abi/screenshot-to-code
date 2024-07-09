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
      // Assuming there's a toast function available in the context
      toast.error("Please enter a prompt to generate from");
      return;
    }
    doCreateFromText(text);
  };

  return (
    <div className="mt-4">
      {!isOpen ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setIsOpen(true)}>
            Generate from text prompt
          </Button>
        </div>
      ) : (
        <>
          <Textarea
            ref={textareaRef}
            rows={2}
            placeholder="A Saas admin dashboard"
            className="w-full mb-4"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default GenerateFromText;
