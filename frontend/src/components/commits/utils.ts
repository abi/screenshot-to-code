import { nanoid } from "nanoid";
import {
  AiCreateCommit,
  AiEditCommit,
  CodeCreateCommit,
  Commit,
} from "./types";

export function createCommit(
  commit:
    | Omit<
        AiCreateCommit,
        "hash" | "dateCreated" | "selectedVariantIndex" | "isCommitted"
      >
    | Omit<
        AiEditCommit,
        "hash" | "dateCreated" | "selectedVariantIndex" | "isCommitted"
      >
    | Omit<
        CodeCreateCommit,
        "hash" | "dateCreated" | "selectedVariantIndex" | "isCommitted"
      >
): Commit {
  const hash = nanoid();
  return {
    ...commit,
    hash,
    isCommitted: false,
    dateCreated: new Date(),
    selectedVariantIndex: 0,
  };
}
