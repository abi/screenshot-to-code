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
    inputs: { text: "", images: [""] },
  },
  "1": {
    hash: "1",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "0",
    variants: [{ code: "<html>2. edit with better icons</html>" }],
    selectedVariantIndex: 0,
    inputs: { text: "use better icons", images: [] },
  },
  "2": {
    hash: "2",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "1",
    variants: [{ code: "<html>3. edit with better icons and red text</html>" }],
    selectedVariantIndex: 0,
    inputs: { text: "make text red", images: [] },
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
    inputs: { text: "make text green", images: [] },
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
    inputs: { text: "make text bold", images: [] },
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
    inputs: { text: "", images: [""] },
  },
  "1": {
    hash: "1",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "2", // <- Bad parent hash
    variants: [{ code: "<html>2. edit with better icons</html>" }],
    selectedVariantIndex: 0,
    inputs: { text: "use better icons", images: [] },
  },
};

describe("History Utils", () => {
  test("should correctly extract the history tree", () => {
    expect(extractHistory("2", basicLinearHistory)).toEqual([
      { text: "<html>1. create</html>", images: [] },
      { text: "use better icons", images: [] },
      { text: "<html>2. edit with better icons</html>", images: [] },
      { text: "make text red", images: [] },
      { text: "<html>3. edit with better icons and red text</html>", images: [] },
    ]);

    expect(extractHistory("0", basicLinearHistory)).toEqual([
      { text: "<html>1. create</html>", images: [] },
    ]);

    // Test branching
    expect(extractHistory("3", basicBranchingHistory)).toEqual([
      { text: "<html>1. create</html>", images: [] },
      { text: "use better icons", images: [] },
      { text: "<html>2. edit with better icons</html>", images: [] },
      { text: "make text green", images: [] },
      { text: "<html>4. edit with better icons and green text</html>", images: [] },
    ]);

    expect(extractHistory("4", longerBranchingHistory)).toEqual([
      { text: "<html>1. create</html>", images: [] },
      { text: "use better icons", images: [] },
      { text: "<html>2. edit with better icons</html>", images: [] },
      { text: "make text green", images: [] },
      { text: "<html>4. edit with better icons and green text</html>", images: [] },
      { text: "make text bold", images: [] },
      {
        text: "<html>5. edit with better icons and green, bold text</html>",
        images: [],
      },
    ]);

    expect(extractHistory("2", longerBranchingHistory)).toEqual([
      { text: "<html>1. create</html>", images: [] },
      { text: "use better icons", images: [] },
      { text: "<html>2. edit with better icons</html>", images: [] },
      { text: "make text red", images: [] },
      { text: "<html>3. edit with better icons and red text</html>", images: [] },
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
