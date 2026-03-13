import assetPipelineMap from "../generated/asset-pipeline-map.json";

type AssetPipelineMap = {
  generatedAt?: string;
  sourceToOptimized?: Record<string, string>;
  plantsBySpeciesId?: Record<string, string>;
  potsByPotId?: Record<string, string>;
  sproutStageImagePathByStage?: Record<string, string>;
};

const parsedMap = assetPipelineMap as AssetPipelineMap;
const assetVersionToken = (() => {
  const generatedAt = parsedMap.generatedAt;
  if (!generatedAt) {
    return "";
  }
  const parsedTime = Date.parse(generatedAt);
  if (!Number.isFinite(parsedTime)) {
    return "";
  }
  return String(Math.floor(parsedTime));
})();

const normalizeAssetPath = (value: string): string => value.replace(/\\/g, "/").replace(/^\/+/, "");
const appendAssetVersion = (value: string): string => {
  if (!assetVersionToken) {
    return value;
  }
  if (value.includes("?")) {
    return value;
  }
  return `${value}?v=${assetVersionToken}`;
};

const sourceToOptimized = Object.fromEntries(
  Object.entries(parsedMap.sourceToOptimized ?? {}).map(([sourcePath, outputPath]) => [
    normalizeAssetPath(sourcePath),
    normalizeAssetPath(outputPath)
  ])
);

const plantsBySpeciesId = Object.fromEntries(
  Object.entries(parsedMap.plantsBySpeciesId ?? {}).map(([speciesId, assetPath]) => [speciesId, normalizeAssetPath(assetPath)])
);

const potsByPotId = Object.fromEntries(
  Object.entries(parsedMap.potsByPotId ?? {}).map(([potId, assetPath]) => [potId, normalizeAssetPath(assetPath)])
);

const sproutStageImagePathByStage = Object.fromEntries(
  Object.entries(parsedMap.sproutStageImagePathByStage ?? {}).map(([stage, assetPath]) => [
    stage,
    normalizeAssetPath(assetPath)
  ])
);

export function resolveAssetPath(assetPath: string): string {
  const normalizedPath = normalizeAssetPath(assetPath);
  const resolved = sourceToOptimized[normalizedPath] ?? normalizedPath;
  return appendAssetVersion(resolved);
}

export function getGeneratedPlantImagePathMap(): Record<string, string> {
  return { ...plantsBySpeciesId };
}

export function getGeneratedPotImagePathMap(): Record<string, string> {
  return { ...potsByPotId };
}

export function getGeneratedSproutStageImagePath(stage: number): string | null {
  const key = String(Math.max(1, Math.min(4, Math.floor(stage))));
  return sproutStageImagePathByStage[key] ?? null;
}

export function hasOptimizedSourceAsset(assetPath: string): boolean {
  const normalizedPath = normalizeAssetPath(assetPath);
  return Boolean(sourceToOptimized[normalizedPath]);
}
