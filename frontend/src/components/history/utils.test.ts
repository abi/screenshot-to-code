import { renderHistory } from "./utils";
import { Commit, CommitHash } from "../commits/types";

const basicLinearHistory: Record<CommitHash, Commit> = {
  "0": {
    hash: "0",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_create",
    parentHash: null,
    variants: [{ code: "<html>1. create</html>", history: [] }],
    selectedVariantIndex: 0,
    inputs: { text: "", images: [""] },
  },
  "1": {
    hash: "1",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "0",
    variants: [{ code: "<html>2. edit with better icons</html>", history: [] }],
    selectedVariantIndex: 0,
    inputs: { text: "use better icons", images: [] },
  },
  "2": {
    hash: "2",
    dateCreated: new Date(),
    isCommitted: false,
    type: "ai_edit",
    parentHash: "1",
    variants: [{ code: "<html>3. edit with better icons and red text</html>", history: [] }],
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
    variants: [{ code: "<html>1. create</html>", history: [] }],
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
      { code: "<html>4. edit with better icons and green text</html>", history: [] },
    ],
    selectedVariantIndex: 0,
    inputs: { text: "make text green", images: [] },
  },
};

describe("History Utils", () => {
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
