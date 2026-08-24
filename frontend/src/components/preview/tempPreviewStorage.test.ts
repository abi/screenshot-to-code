import { Commit } from "../commits/types";
import {
  getProjectKey,
  loadTempPreview,
  removeTempPreview,
  saveTempPreview,
} from "./tempPreviewStorage";

function commit(hash: string, parentHash: string | null): Commit {
  return {
    hash,
    parentHash,
    dateCreated: new Date(),
    isCommitted: true,
    variants: [{ code: "<html></html>", history: [] }],
    selectedVariantIndex: 0,
    type: "code_create",
    inputs: null,
  };
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("temporary preview persistence", () => {
  it("uses the root commit as the stable project key across versions", () => {
    const commits = {
      root: commit("root", null),
      edit: commit("edit", "root"),
      latest: commit("latest", "edit"),
    };

    expect(getProjectKey(commits, "root")).toBe("root");
    expect(getProjectKey(commits, "latest")).toBe("root");
  });

  it("saves, loads, and removes a scoped connection", () => {
    const storage = new MemoryStorage();
    const connection = {
      tempId: "temp-1",
      canonicalUrl: "https://preview.temp.md",
      updateToken: "secret",
      expiresAt: "2026-08-31T00:00:00.000Z",
    };

    saveTempPreview("root", connection, storage);
    expect(loadTempPreview("root", storage)).toEqual(connection);

    removeTempPreview("root", storage);
    expect(loadTempPreview("root", storage)).toBeNull();
  });

  it("ignores malformed local data", () => {
    const storage = new MemoryStorage();
    storage.setItem("screenshot-to-code.temp-previews.v1", "not json");

    expect(loadTempPreview("root", storage)).toBeNull();
  });
});
