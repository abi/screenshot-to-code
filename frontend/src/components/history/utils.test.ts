import { expect, test } from "vitest";
import { extractHistoryTree } from "./utils";
import type { History } from "./history_types";

const data: History = [
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

test("should only include history from this point onward", () => {
  expect(extractHistoryTree(data, 2)).toEqual([
    "<html>1. create</html>",
    "use better icons",
    "<html>2. edit with better icons</html>",
    "make text red",
    "<html>3. edit with better icons and red text</html>",
  ]);

  expect(extractHistoryTree(data, 0)).toEqual(["<html>1. create</html>"]);
});
