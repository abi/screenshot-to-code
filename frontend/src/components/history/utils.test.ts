import { expect, test } from "vitest";
import { extractHistoryTree, renderHistory } from "./utils";
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

const basicLinearHistoryWithCode: History = [
  {
    type: "code_create",
    parentIndex: null,
    code: "<html>1. create</html>",
    inputs: {
      code: "<html>1. create</html>",
    },
  },
  ...basicLinearHistory.slice(1),
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

const basicBadHistory: History = [
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
    parentIndex: 2, // <- Bad parent index
    code: "<html>2. edit with better icons</html>",
    inputs: {
      prompt: "use better icons",
    },
  },
];

test("should correctly extract the history tree", () => {
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

  // Errors

  // Bad index
  expect(() => extractHistoryTree(basicLinearHistory, 100)).toThrow();
  expect(() => extractHistoryTree(basicLinearHistory, -2)).toThrow();

  // Bad tree
  expect(() => extractHistoryTree(basicBadHistory, 1)).toThrow();
});

test("should correctly render the history tree", () => {
  expect(renderHistory(basicLinearHistory, 2)).toEqual([
    {
      isActive: false,
      parentVersion: null,
      summary: "Create",
      type: "Create",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "use better icons",
      type: "Edit",
    },
    {
      isActive: true,
      parentVersion: null,
      summary: "make text red",
      type: "Edit",
    },
  ]);

  // Current version is the first version
  expect(renderHistory(basicLinearHistory, 0)).toEqual([
    {
      isActive: true,
      parentVersion: null,
      summary: "Create",
      type: "Create",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "use better icons",
      type: "Edit",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "make text red",
      type: "Edit",
    },
  ]);

  // Render a history with code
  expect(renderHistory(basicLinearHistoryWithCode, 0)).toEqual([
    {
      isActive: true,
      parentVersion: null,
      summary: "Imported from code",
      type: "Imported from code",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "use better icons",
      type: "Edit",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "make text red",
      type: "Edit",
    },
  ]);

  // Render a non-linear history
  expect(renderHistory(basicBranchingHistory, 3)).toEqual([
    {
      isActive: false,
      parentVersion: null,
      summary: "Create",
      type: "Create",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "use better icons",
      type: "Edit",
    },
    {
      isActive: false,
      parentVersion: null,
      summary: "make text red",
      type: "Edit",
    },
    {
      isActive: true,
      parentVersion: "v2",
      summary: "make text green",
      type: "Edit",
    },
  ]);
});
