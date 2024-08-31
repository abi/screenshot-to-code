import { extractHistory, renderHistory } from "./utils";
import { Commit, CommitHash } from "../commits/types";

const basicLinearHistory: Record<CommitHash, Commit> = {
  "0": {
    hash: "0",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_create",
    parentHash: null,
    variants: [{ code: "<html>1. create</html>" }],
    selectedVariantIndex: 0,
    inputs: {
      image_url: "",
    },
  },
  "1": {
    hash: "1",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "0",
    variants: [{ code: "<html>2. edit with better icons</html>" }],
    selectedVariantIndex: 0,
    inputs: {
      prompt: "use better icons",
    },
  },
  "2": {
    hash: "2",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "1",
    variants: [{ code: "<html>3. edit with better icons and red text</html>" }],
    selectedVariantIndex: 0,
    inputs: {
      prompt: "make text red",
    },
  },
};

const basicLinearHistoryWithCode: Record<CommitHash, Commit> = {
  "0": {
    hash: "0",
    dateCreated: new Date(),
    isCommitted: false,
    type: "code_create",
    parentHash: null,
    variants: [{ code: "<html>1. create</html>" }],
    selectedVariantIndex: 0,
    inputs: null,
  },
  ...Object.fromEntries(Object.entries(basicLinearHistory).slice(1)),
};

const basicBranchingHistory: Record<CommitHash, Commit> = {
  ...basicLinearHistory,
  "3": {
    hash: "3",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "1",
    variants: [
      { code: "<html>4. edit with better icons and green text</html>" },
    ],
    selectedVariantIndex: 0,
    inputs: {
      prompt: "make text green",
    },
  },
};

const longerBranchingHistory: Record<CommitHash, Commit> = {
  ...basicBranchingHistory,
  "4": {
    hash: "4",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "3",
    variants: [
      { code: "<html>5. edit with better icons and green, bold text</html>" },
    ],
    selectedVariantIndex: 0,
    inputs: {
      prompt: "make text bold",
    },
  },
};

const basicBadHistory: Record<CommitHash, Commit> = {
  "0": {
    hash: "0",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_create",
    parentHash: null,
    variants: [{ code: "<html>1. create</html>" }],
    selectedVariantIndex: 0,
    inputs: {
      image_url: "",
    },
  },
  "1": {
    hash: "1",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "2", // <- Bad parent hash
    variants: [{ code: "<html>2. edit with better icons</html>" }],
    selectedVariantIndex: 0,
    inputs: {
      prompt: "use better icons",
    },
  },
};

describe("History Utils", () => {
  test("should correctly extract the history tree", () => {
    expect(extractHistory("2", basicLinearHistory)).toEqual([
      "<html>1. create</html>",
      "use better icons",
      "<html>2. edit with better icons</html>",
      "make text red",
      "<html>3. edit with better icons and red text</html>",
    ]);

    expect(extractHistory("0", basicLinearHistory)).toEqual([
      "<html>1. create</html>",
    ]);

    // Test branching
    expect(extractHistory("3", basicBranchingHistory)).toEqual([
      "<html>1. create</html>",
      "use better icons",
      "<html>2. edit with better icons</html>",
      "make text green",
      "<html>4. edit with better icons and green text</html>",
    ]);

    expect(extractHistory("4", longerBranchingHistory)).toEqual([
      "<html>1. create</html>",
      "use better icons",
      "<html>2. edit with better icons</html>",
      "make text green",
      "<html>4. edit with better icons and green text</html>",
      "make text bold",
      "<html>5. edit with better icons and green, bold text</html>",
    ]);

    expect(extractHistory("2", longerBranchingHistory)).toEqual([
      "<html>1. create</html>",
      "use better icons",
      "<html>2. edit with better icons</html>",
      "make text red",
      "<html>3. edit with better icons and red text</html>",
    ]);

    // Errors

    // Bad hash
    expect(() => extractHistory("100", basicLinearHistory)).toThrow();

    // Bad tree
    expect(() => extractHistory("1", basicBadHistory)).toThrow();
  });

  test("should correctly render the history tree", () => {
    expect(renderHistory(Object.values(basicLinearHistory))).toEqual([
      {
        ...basicLinearHistory["0"],
        type: "Create",
        summary: "Create",
        parentVersion: null,
      },
      {
        ...basicLinearHistory["1"],
        type: "Edit",
        summary: "use better icons",
        parentVersion: null,
      },
      {
        ...basicLinearHistory["2"],
        type: "Edit",
        summary: "make text red",
        parentVersion: null,
      },
    ]);

    // Render a history with code
    expect(renderHistory(Object.values(basicLinearHistoryWithCode))).toEqual([
      {
        ...basicLinearHistoryWithCode["0"],
        type: "Imported from code",
        summary: "Imported from code",
        parentVersion: null,
      },
      {
        ...basicLinearHistoryWithCode["1"],
        type: "Edit",
        summary: "use better icons",
        parentVersion: null,
      },
      {
        ...basicLinearHistoryWithCode["2"],
        type: "Edit",
        summary: "make text red",
        parentVersion: null,
      },
    ]);

    // Render a non-linear history
    expect(renderHistory(Object.values(basicBranchingHistory))).toEqual([
      {
        ...basicBranchingHistory["0"],
        type: "Create",
        summary: "Create",
        parentVersion: null,
      },
      {
        ...basicBranchingHistory["1"],
        type: "Edit",
        summary: "use better icons",
        parentVersion: null,
      },
      {
        ...basicBranchingHistory["2"],
        type: "Edit",
        summary: "make text red",
        parentVersion: null,
      },
      {
        ...basicBranchingHistory["3"],
        type: "Edit",
        summary: "make text green",
        parentVersion: 2,
      },
    ]);
  });
});
