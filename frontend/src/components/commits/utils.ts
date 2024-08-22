import { nanoid } from "nanoid";
import {
  AiCreateCommit,
  AiEditCommit,
  CodeCreateCommit,
  Commit,
} from "./types";

export function createCommit(
  commit:
    | Omit<AiCreateCommit, "hash" | "dateCreated" | "selectedVariantIndex">
    | Omit<AiEditCommit, "hash" | "dateCreated" | "selectedVariantIndex">
    | Omit<CodeCreateCommit, "hash" | "dateCreated" | "selectedVariantIndex">
): Commit {
  const hash = nanoid();
  return { ...commit, hash, dateCreated: new Date(), selectedVariantIndex: 0 };
}
