import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeTab from "./CodeTab";

jest.mock("copy-to-clipboard", () => jest.fn(() => true));
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("./CodeMirror", () => ({
  __esModule: true,
  default: ({ code }: { code: string }) => (
    <div data-testid="code-mirror">{code}</div>
  ),
}));

const mockSettings = {
  openAiApiKey: null,
  openAiBaseURL: null,
  screenshotOneApiKey: null,
  isImageGenerationEnabled: false,
  editorTheme: "cobalt" as const,
  generatedCodeConfig: "html_tailwind" as const,
  codeGenerationModel: "claude_4_sonnet" as const,
  isTermOfServiceAccepted: true,
  accessCode: null,
  anthropicApiKey: null,
};

describe("CodeTab", () => {
  const defaultProps = {
    code: "<html><body>Test Code</body></html>",
    setCode: jest.fn(),
    settings: mockSettings,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Copy Code button", () => {
    it("renders copy code button", () => {
      render(<CodeTab {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-code-btn");
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveTextContent("Copy Code");
    });

    it("copies code to clipboard when clicked", async () => {
      const copy = require("copy-to-clipboard");
      const toast = require("react-hot-toast");
      const user = userEvent.setup();

      render(<CodeTab {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-code-btn");
      await user.click(copyButton);

      expect(copy).toHaveBeenCalledWith(defaultProps.code);
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
    });

    it("has correct accessibility attributes", () => {
      render(<CodeTab {...defaultProps} />);

      const copyButton = screen.getByTestId("copy-code-btn");
      expect(copyButton).toHaveAttribute("role", "button");
      expect(copyButton).toHaveAttribute("title", "Copy Code");
    });
  });

  describe("CodePen button", () => {
    it("renders codepen button", () => {
      render(<CodeTab {...defaultProps} />);

      const codepenButton = screen.getByTestId("codepen-btn");
      expect(codepenButton).toBeInTheDocument();
    });

    it("creates form with correct attributes when clicked", async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      const appendedForms: HTMLFormElement[] = [];

      const originalAppendChild = document.body.appendChild.bind(document.body);
      jest.spyOn(document.body, "appendChild").mockImplementation((node) => {
        if (node instanceof HTMLFormElement) {
          appendedForms.push(node);
          node.submit = mockSubmit;
          return node;
        }
        return originalAppendChild(node);
      });

      render(<CodeTab {...defaultProps} />);

      const codepenButton = screen.getByTestId("codepen-btn");
      await user.click(codepenButton);

      expect(appendedForms.length).toBe(1);
      const form = appendedForms[0];
      expect(form.getAttribute("method")).toBe("POST");
      expect(form.getAttribute("action")).toBe("https://codepen.io/pen/define");
      expect(form.getAttribute("target")).toBe("_blank");
      expect(mockSubmit).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it("includes tailwind CDN in the codepen data", async () => {
      const user = userEvent.setup();
      const appendedForms: HTMLFormElement[] = [];

      const originalAppendChild = document.body.appendChild.bind(document.body);
      jest.spyOn(document.body, "appendChild").mockImplementation((node) => {
        if (node instanceof HTMLFormElement) {
          appendedForms.push(node);
          node.submit = jest.fn();
          return node;
        }
        return originalAppendChild(node);
      });

      render(<CodeTab {...defaultProps} />);

      const codepenButton = screen.getByTestId("codepen-btn");
      await user.click(codepenButton);

      const form = appendedForms[0];
      const input = form.querySelector("input[name='data']") as HTMLInputElement;
      const data = JSON.parse(input.value);
      expect(data.js_external).toContain("cdn.tailwindcss.com");

      jest.restoreAllMocks();
    });

    it("includes Ionic CSS when code contains ion- elements", async () => {
      const user = userEvent.setup();
      const ionicCode = "<html><body><ion-button>Test</ion-button></body></html>";
      const appendedForms: HTMLFormElement[] = [];

      const originalAppendChild = document.body.appendChild.bind(document.body);
      jest.spyOn(document.body, "appendChild").mockImplementation((node) => {
        if (node instanceof HTMLFormElement) {
          appendedForms.push(node);
          node.submit = jest.fn();
          return node;
        }
        return originalAppendChild(node);
      });

      render(<CodeTab {...defaultProps} code={ionicCode} />);

      const codepenButton = screen.getByTestId("codepen-btn");
      await user.click(codepenButton);

      const form = appendedForms[0];
      const input = form.querySelector("input[name='data']") as HTMLInputElement;
      const data = JSON.parse(input.value);
      expect(data.css_external).toContain("ionic.bundle.css");
      expect(data.js_external).toContain("ionic.esm.js");

      jest.restoreAllMocks();
    });
  });

  describe("Code display", () => {
    it("renders CodeMirror with the provided code", () => {
      render(<CodeTab {...defaultProps} />);

      const codeMirror = screen.getByTestId("code-mirror");
      expect(codeMirror).toHaveTextContent(defaultProps.code);
    });
  });
});
