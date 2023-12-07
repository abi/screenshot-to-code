import { expect, test } from "vitest";
import { extractHistoryTree } from "./utils";

const data = [
  {
    type: "ai_edit" as const,
    code: "<html>edit with better icons and red text</html>",
    inputs: {
      prompt: "make text red",
    },
  },
  {
    type: "ai_edit" as const,
    code: "<html>edit with better icons</html>",
    inputs: {
      prompt: "use better icons",
    },
  },
  {
    type: "ai_create" as const,
    code: "<html>create</html>",
    inputs: {
      image_url: "",
    },
  },
];

test("should only include history from this point onward", () => {
  expect(extractHistoryTree(data, 0)).toEqual([
    "<html>create</html>",
    "use better icons",
    "<html>edit with better icons</html>",
    "make text red",
    "<html>edit with better icons and red text</html>",
  ]);

  expect(extractHistoryTree(data, 2)).toEqual(["<html>create</html>"]);
});
