import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryDisplay from "./HistoryDisplay";
import { useProjectStore } from "../../store/project-store";
import { Commit, AiCreateCommit, AiEditCommit } from "../commits/types";

jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
}));

// Mock Radix UI Collapsible components
jest.mock("../ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible">{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

// Mock Badge component
jest.mock("../ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

const createMockCreateCommit = (
  hash: string,
  parentHash: string | null = null,
  dateCreated: Date = new Date()
): AiCreateCommit => ({
  hash,
  type: "ai_create",
  parentHash,
  dateCreated,
  inputs: { text: "Create from screenshot", images: [] },
  variants: [{ code: "<html>test</html>", status: "complete" }],
  selectedVariantIndex: 0,
  isCommitted: true,
});

const createMockEditCommit = (
  hash: string,
  parentHash: string,
  editText: string,
  dateCreated: Date = new Date()
): AiEditCommit => ({
  hash,
  type: "ai_edit",
  parentHash,
  dateCreated,
  inputs: { text: editText, images: [] },
  variants: [{ code: "<html>edited</html>", status: "complete" }],
  selectedVariantIndex: 0,
  isCommitted: true,
});

describe("HistoryDisplay", () => {
  beforeEach(() => {
    useProjectStore.setState({
      commits: {},
      head: null,
    });
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("returns null when there are no commits", () => {
      const { container } = render(
        <HistoryDisplay shouldDisableReverts={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders version history when commits exist", () => {
      useProjectStore.setState({
        commits: {
          hash1: createMockCreateCommit("hash1"),
        },
        head: "hash1",
      });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      expect(screen.getByTestId("version-history")).toBeInTheDocument();
      expect(screen.getByText("Versions")).toBeInTheDocument();
    });

    it("renders correct number of versions", () => {
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
        hash3: createMockEditCommit("hash3", "hash2", "make text italic", new Date("2024-01-01T00:02:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash3" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      expect(screen.getByTestId("version-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("version-item-2")).toBeInTheDocument();
      expect(screen.getByTestId("version-item-3")).toBeInTheDocument();
    });

    it("displays version labels correctly", () => {
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash2" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      expect(screen.getByTestId("version-label-1")).toHaveTextContent("v1");
      expect(screen.getByTestId("version-label-2")).toHaveTextContent("v2");
    });
  });

  describe("version selection", () => {
    it("highlights the active version", () => {
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash2" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      expect(screen.getByTestId("version-container-2")).toHaveAttribute(
        "data-active",
        "true"
      );
      expect(screen.getByTestId("version-container-1")).toHaveAttribute(
        "data-active",
        "false"
      );
    });

    it("changes head when clicking a different version", async () => {
      const user = userEvent.setup();
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash2" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      await user.click(screen.getByTestId("version-select-1"));

      expect(useProjectStore.getState().head).toBe("hash1");
    });

    it("shows error toast when reverts are disabled", async () => {
      const toast = require("react-hot-toast");
      const user = userEvent.setup();
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash2" });

      render(<HistoryDisplay shouldDisableReverts={true} />);

      await user.click(screen.getByTestId("version-select-1"));

      expect(toast.error).toHaveBeenCalledWith(
        "Please wait for code generation to complete before viewing an older version."
      );
      expect(useProjectStore.getState().head).toBe("hash2");
    });
  });

  describe("branching", () => {
    it("displays parent version information for branches", () => {
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
        hash3: createMockEditCommit("hash3", "hash1", "make text yellow", new Date("2024-01-01T00:02:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash3" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      // hash3 branches from hash1 (v1), so it should show (parent: v1)
      const version3 = screen.getByTestId("version-item-3");
      expect(version3).toHaveTextContent("(parent: v1)");
    });
  });

  describe("version list order", () => {
    it("sorts commits by date created (oldest first)", () => {
      const commits: Record<string, Commit> = {
        hash3: createMockEditCommit("hash3", "hash2", "make text italic", new Date("2024-01-01T00:02:00Z")),
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make text blue", new Date("2024-01-01T00:01:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash3" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      const versionList = screen.getByTestId("version-list");
      const items = versionList.querySelectorAll("li");

      expect(items).toHaveLength(3);
    });
  });

  describe("edit summary display", () => {
    it("displays edit instruction text as summary", () => {
      const commits: Record<string, Commit> = {
        hash1: createMockCreateCommit("hash1", null, new Date("2024-01-01T00:00:00Z")),
        hash2: createMockEditCommit("hash2", "hash1", "make the button background blue", new Date("2024-01-01T00:01:00Z")),
      };

      useProjectStore.setState({ commits, head: "hash2" });

      render(<HistoryDisplay shouldDisableReverts={false} />);

      expect(screen.getByText("make the button background blue")).toBeInTheDocument();
    });
  });
});
