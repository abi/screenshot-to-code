import { expect, test } from "vitest";
import { extractHistoryTree } from "./utils";
import type { History } from "./history_types";

const basicLinearHistory: History = [
  {
    type: "ai_create",
    parentIndex: null,
    code: "<html>1. create</html>",
    inputs: {
      image_url: "",
    },
  },
  {
    type: "ai_edit",
    parentIndex: 0,
    code: "<html>2. edit with better icons</html>",
    inputs: {
      prompt: "use better icons",
    },
  },
  {
    type: "ai_edit",
    parentIndex: 1,
    code: "<html>3. edit with better icons and red text</html>",
    inputs: {
      prompt: "make text red",
    },
  },
];

const basicBranchingHistory: History = [
  ...basicLinearHistory,
  {
    type: "ai_edit",
    parentIndex: 1,
    code: "<html>4. edit with better icons and green text</html>",
    inputs: {
      prompt: "make text green",
    },
  },
];

const longerBranchingHistory: History = [
  ...basicBranchingHistory,
  {
    type: "ai_edit",
    parentIndex: 3,
    code: "<html>5. edit with better icons and green, bold text</html>",
    inputs: {
      prompt: "make text bold",
    },
  },
];

test("should only include history from this point onward", () => {
  expect(extractHistoryTree(basicLinearHistory, 2)).toEqual([
    "<html>1. create</html>",
    "use better icons",
    "<html>2. edit with better icons</html>",
    "make text red",
    "<html>3. edit with better icons and red text</html>",
  ]);

  expect(extractHistoryTree(basicLinearHistory, 0)).toEqual([
    "<html>1. create</html>",
  ]);

  // Test branching
  expect(extractHistoryTree(basicBranchingHistory, 3)).toEqual([
    "<html>1. create</html>",
    "use better icons",
    "<html>2. edit with better icons</html>",
    "make text green",
    "<html>4. edit with better icons and green text</html>",
  ]);

  expect(extractHistoryTree(longerBranchingHistory, 4)).toEqual([
    "<html>1. create</html>",
    "use better icons",
    "<html>2. edit with better icons</html>",
    "make text green",
    "<html>4. edit with better icons and green text</html>",
    "make text bold",
    "<html>5. edit with better icons and green, bold text</html>",
  ]);

  expect(extractHistoryTree(longerBranchingHistory, 2)).toEqual([
    "<html>1. create</html>",
    "use better icons",
    "<html>2. edit with better icons</html>",
    "make text red",
    "<html>3. edit with better icons and red text</html>",
  ]);

  // Errors - TODO: Handle these
  // Bad index
  // TODO: Throw an exception instead?
  expect(extractHistoryTree(basicLinearHistory, 100)).toEqual([]);
  expect(extractHistoryTree(basicLinearHistory, -2)).toEqual([]);

  // Bad tree
});
