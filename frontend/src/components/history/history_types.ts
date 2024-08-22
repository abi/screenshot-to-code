export type CommitType = "ai_create" | "ai_edit" | "code_create";

export type CommitHash = string;

export type Variant = {
  code: string;
};

export type BaseCommit = {
  hash: CommitHash;
  parentHash: CommitHash | null;
  date_created: Date;
  variants: Variant[];
  selectedVariantIndex: number;
};

import { nanoid } from "nanoid";

// TODO: Move to a different file
export function createCommit(
  commit: Omit<AiCreateCommit, "hash"> | Omit<AiEditCommit, "hash">
): Commit {
  const hash = nanoid();
  return { ...commit, hash };
}

export type AiCreateCommit = BaseCommit & {
  type: "ai_create";
  inputs: {
    image_url: string;
  };
};

export type AiEditCommit = BaseCommit & {
  type: "ai_edit";
  inputs: {
    prompt: string;
  };
};

export type Commit = AiCreateCommit | AiEditCommit;

export type RenderedHistoryItem = {
  type: string;
  summary: string;
  parentVersion: string | null;
  isActive: boolean;
};
