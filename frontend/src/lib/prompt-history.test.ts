import {
  buildAssistantHistoryMessage,
  buildUserHistoryMessage,
  cloneVariantHistory,
  registerAssetIds,
  toRequestHistory,
} from "./prompt-history";
import { PromptAsset } from "../types";

describe("prompt-history helpers", () => {
  test("cloneVariantHistory deep-copies asset id arrays", () => {
    const source = [
      {
        role: "user" as const,
        text: "Update this",
        imageAssetIds: ["img-1"],
        videoAssetIds: ["vid-1"],
      },
    ];

    const cloned = cloneVariantHistory(source);
    cloned[0].imageAssetIds.push("img-2");
    cloned[0].videoAssetIds.push("vid-2");

    expect(source[0].imageAssetIds).toEqual(["img-1"]);
    expect(source[0].videoAssetIds).toEqual(["vid-1"]);
    expect(cloned[0].imageAssetIds).toEqual(["img-1", "img-2"]);
    expect(cloned[0].videoAssetIds).toEqual(["vid-1", "vid-2"]);
  });

  test("registerAssetIds reuses existing ids and only upserts new assets", () => {
    const assetsById: Record<string, PromptAsset> = {
      existing: { id: "existing", type: "image", dataUrl: "data:image/one" },
    };
    const upsertCalls: PromptAsset[][] = [];

    let idCounter = 0;
    const ids = registerAssetIds(
      "image",
      ["data:image/one", "data:image/two", "data:image/two"],
      () => assetsById,
      (assets) => {
        upsertCalls.push(assets);
        for (const asset of assets) assetsById[asset.id] = asset;
      },
      () => `generated-${++idCounter}`
    );

    expect(ids[0]).toBe("existing");
    expect(ids[1]).toBe(ids[2]);
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]).toHaveLength(1);
    expect(upsertCalls[0][0].type).toBe("image");
    expect(upsertCalls[0][0].dataUrl).toBe("data:image/two");
  });

  test("registerAssetIds ignores blank media strings", () => {
    const upsertCalls: PromptAsset[][] = [];
    const ids = registerAssetIds(
      "video",
      ["", "   "],
      () => ({}),
      (assets) => upsertCalls.push(assets),
      () => "unused"
    );

    expect(ids).toEqual([]);
    expect(upsertCalls).toEqual([]);
  });

  test("toRequestHistory resolves ids and drops missing assets", () => {
    const assetsById: Record<string, PromptAsset> = {
      img1: { id: "img1", type: "image", dataUrl: "data:image/one" },
      vid1: { id: "vid1", type: "video", dataUrl: "data:video/one" },
    };

    const history = [
      {
        role: "user" as const,
        text: "Do this",
        imageAssetIds: ["img1", "img-missing"],
        videoAssetIds: ["vid1", "vid-missing"],
      },
      {
        role: "assistant" as const,
        text: "<html/>",
        imageAssetIds: [],
        videoAssetIds: [],
      },
    ];

    expect(toRequestHistory(history, () => assetsById)).toEqual([
      {
        role: "user",
        text: "Do this",
        images: ["data:image/one"],
        videos: ["data:video/one"],
      },
      {
        role: "assistant",
        text: "<html/>",
        images: [],
        videos: [],
      },
    ]);
  });

  test("message builders produce expected shapes", () => {
    expect(buildUserHistoryMessage("change", ["img"], ["vid"])).toEqual({
      role: "user",
      text: "change",
      imageAssetIds: ["img"],
      videoAssetIds: ["vid"],
    });

    expect(buildAssistantHistoryMessage("<html/>")).toEqual({
      role: "assistant",
      text: "<html/>",
      imageAssetIds: [],
      videoAssetIds: [],
    });
  });
});
