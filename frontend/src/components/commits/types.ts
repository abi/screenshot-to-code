export type CommitHash = string;

export type Variant = {
  code: string;
};

export type BaseCommit = {
  hash: CommitHash;
  parentHash: CommitHash | null;
  dateCreated: Date;
  isCommitted: boolean;
  variants: Variant[];
  selectedVariantIndex: number;
};

export type CommitType = "ai_create" | "ai_edit" | "code_create";

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

export type CodeCreateCommit = BaseCommit & {
  type: "code_create";
  inputs: null;
};

export type Commit = AiCreateCommit | AiEditCommit | CodeCreateCommit;
