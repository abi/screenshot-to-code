import { VariantHistoryMessage } from "../components/commits/types";
import {
  CodeGenerationParams,
  PromptAsset,
  PromptAssetType,
  PromptHistoryMessage,
} from "../types";

export type GenerationRequest = CodeGenerationParams & {
  variantHistory: VariantHistoryMessage[];
};

type AssetsById = Record<string, PromptAsset>;
type GetAssetsById = () => AssetsById;
type UpsertPromptAssets = (assets: PromptAsset[]) => void;
type CreateId = () => string;

export function cloneVariantHistory(
  history: VariantHistoryMessage[]
): VariantHistoryMessage[] {
  return history.map((message) => ({
    ...message,
    imageAssetIds: [...message.imageAssetIds],
    videoAssetIds: [...message.videoAssetIds],
  }));
}

export function registerAssetIds(
  type: PromptAssetType,
  dataUrls: string[],
  getAssetsById: GetAssetsById,
  upsertPromptAssets: UpsertPromptAssets,
  createId: CreateId
): string[] {
  const existingByUrl = new Map<string, string>();
  Object.values(getAssetsById()).forEach((asset) => {
    if (asset.type === type) {
      existingByUrl.set(asset.dataUrl, asset.id);
    }
  });

  const newAssets: PromptAsset[] = [];
  const ids: string[] = [];

  for (const rawDataUrl of dataUrls) {
    const dataUrl = rawDataUrl.trim();
    if (!dataUrl) continue;

    let id = existingByUrl.get(dataUrl);
    if (!id) {
      id = createId();
      existingByUrl.set(dataUrl, id);
      newAssets.push({ id, type, dataUrl });
    }
    ids.push(id);
  }

  if (newAssets.length > 0) {
    upsertPromptAssets(newAssets);
  }

  return ids;
}

export function resolveAssetIdsToDataUrls(
  assetIds: string[],
  getAssetsById: GetAssetsById
): string[] {
  const assetsById = getAssetsById();
  return assetIds
    .map((assetId) => assetsById[assetId]?.dataUrl)
    .filter((value): value is string => Boolean(value));
}

export function toRequestHistory(
  history: VariantHistoryMessage[],
  getAssetsById: GetAssetsById
): PromptHistoryMessage[] {
  return history.map((message) => ({
    role: message.role,
    text: message.text,
    images: resolveAssetIdsToDataUrls(message.imageAssetIds, getAssetsById),
    videos: resolveAssetIdsToDataUrls(message.videoAssetIds, getAssetsById),
  }));
}

export function buildUserHistoryMessage(
  text: string,
  imageAssetIds: string[] = [],
  videoAssetIds: string[] = []
): VariantHistoryMessage {
  return {
    role: "user",
    text,
    imageAssetIds,
    videoAssetIds,
  };
}

export function buildAssistantHistoryMessage(
  code: string
): VariantHistoryMessage {
  return {
    role: "assistant",
    text: code,
    imageAssetIds: [],
    videoAssetIds: [],
  };
}
