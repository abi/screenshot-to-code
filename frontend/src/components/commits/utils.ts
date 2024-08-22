import { nanoid } from "nanoid";
import {
  AiCreateCommit,
  AiEditCommit,
  CodeCreateCommit,
  Commit,
} from "./types";

export function createCommit(
  commit:
    | Omit<AiCreateCommit, "hash">
    | Omit<AiEditCommit, "hash">
    | Omit<CodeCreateCommit, "hash">
): Commit {
  const hash = nanoid();
  return { ...commit, hash };
}
