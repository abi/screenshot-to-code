import { useState, useRef, useEffect } from "react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import toast from "react-hot-toast";

interface Props {
  doCreateFromText: (text: string) => void;
}

const EXAMPLE_PROMPTS = [
  "A cozy cafe menu board with seasonal specials",
  "A minimalist portfolio with case studies and a contact section",
  "A fintech savings app dashboard with balances and goals",
  "A travel itinerary planner with map and daily schedule",
];

function TextTab({ doCreateFromText }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleGenerate = () => {
    if (text.trim() === "") {
      toast.error("Please enter a description");
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

  const handleExampleClick = (example: string) => {
    setText(example);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col gap-6 p-8 border border-gray-200 rounded-xl bg-gray-50/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M17 6.1H3" />
                <path d="M21 12.1H3" />
                <path d="M15.1 18H3" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-gray-700 font-medium">Generate from Text</h3>
            </div>
          </div>

          <div className="space-y-4">
            <Textarea
              ref={textareaRef}
              rows={4}
              placeholder="Describe the UI you want to create..."
              className="w-full resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="text-input"
            />

            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-500">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors truncate max-w-[200px]"
                    title={example}
                  >
                    {example.length > 30 ? example.slice(0, 30) + "..." : example}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full"
              size="lg"
              data-testid="text-generate"
            >
              Generate
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Press Cmd/Ctrl + Enter to generate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextTab;
