#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const SOURCE_ROOT = path.join(APP_ROOT, "assets-source");
const SOURCE_ASSETS_ROOT = path.join(SOURCE_ROOT, "assets");
const PUBLIC_ROOT = path.join(APP_ROOT, "public");
const ASSETS_ROOT = path.join(PUBLIC_ROOT, "assets");
const GENERATED_ASSETS_ROOT = path.join(ASSETS_ROOT, "generated");
const GENERATED_MAP_PATH = path.join(APP_ROOT, "src", "generated", "asset-pipeline-map.json");
const PLANTS_SOURCE_PATH = path.join(APP_ROOT, "src", "content", "plants.ts");
const POTS_SOURCE_PATH = path.join(APP_ROOT, "src", "content", "pots.ts");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const PIPELINE_GROUPS = [
  { name: "pots", sourceDir: path.join(SOURCE_ASSETS_ROOT, "pots"), maxDimension: 512 },
  { name: "plants", sourceDir: path.join(SOURCE_ASSETS_ROOT, "plants"), maxDimension: 768 },
  { name: "backgrounds", sourceDir: path.join(SOURCE_ASSETS_ROOT, "backgrounds"), maxDimension: 1024 },
  { name: "ui", sourceDir: path.join(SOURCE_ASSETS_ROOT, "ui"), maxDimension: 768 },
  { name: "sprout", sourceDir: path.join(SOURCE_ASSETS_ROOT, "ui", "sprout"), maxDimension: 768 }
];

const PLANT_FILE_ALIASES = {
  plant_monstera: ["plant_ceriman", "ceriman", "몬스테라"],
  plant_rubber_tree: ["plant_rubber plant", "rubber plant", "인도고무나무"],
  plant_stuckyi: ["plant_stookie", "stookie", "스투키"],
  plant_rocket_larkspur: ["plant_delphinium", "delphinium", "델피늄"]
};
const POT_FILE_ALIASES = {
  pot_clay: ["pot_clay pot", "clay", "classic", "basic", "terracotta"],
  pot_white: ["white", "ivory"],
  pot_yellow: ["yellow", "gold"],
  pot_green: ["green"],
  pot_silver: ["pot_sliver", "pot_silver", "sliver", "silver"],
  pot_blue: ["pot_blue", "blue"],
  pot_pink: ["pot_pink", "pink"],
  pot_violet: ["pot_violet", "violet", "purple"],
  pot_cylinder: ["pot_cylinder", "pot_cylinder pot", "cylinder", "cylinder pot"],
  pot_moon_jar: ["pot_moon jar", "pot_moon_jar", "pot_moonjar", "moon jar", "moonjar"],
  pot_organic_cream: ["pot_organic cream", "pot_Organic cream", "organic cream", "cream"],
  pot_organic_mocha: ["pot_organic mocha", "pot_Organic mocha", "organic mocha", "mocha"],
  pot_organic_olive: ["pot_organic olive", "pot_Organic olive", "organic olive", "olive"],
  pot_organic_sand: ["pot_organic sand", "pot_Organic sand", "organic sand", "sand"],
  pot_modern_mocha: ["pot_modern_mocha", "modern mocha", "mocha modern"],
  pot_modern_sand: ["pot_modern_sand", "modern sand", "sand modern"],
  pot_modern_olive: ["pot_modern_olive", "modern olive", "olive modern"],
  pot_moon_jar_cream: ["pot_moon jar_cream", "pot_moon_jar_cream", "moon jar cream", "moonjarcream"],
  pot_moon_jar_crock: ["pot_moon jar_crock", "pot_moon_jar_crock", "moon jar crock", "moonjarcrock"],
  pot_antique_greece: ["pot_antique_Greece", "pot_antique_greece", "antique greece", "greece antique"]
};

const args = new Set(process.argv.slice(2));
const isWatchMode = args.has("--watch");

const toPosixPath = (value) => value.split(path.sep).join("/");

const normalizeToken = (value) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");

const fileExists = async (targetPath) => {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const runCommand = (command, commandArgs) =>
  new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr
      });
    });
    child.on("error", (error) => {
      resolve({
        code: 1,
        stdout,
        stderr: String(error?.message ?? error)
      });
    });
  });

const commandExists = async (commandName) => {
  const result = await runCommand("sh", ["-lc", `command -v ${commandName}`]);
  return result.code === 0;
};

const walkImageFiles = async (rootDir) => {
  if (!(await fileExists(rootDir))) {
    return [];
  }
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const absPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const childFiles = await walkImageFiles(absPath);
      files.push(...childFiles);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      continue;
    }
    files.push(absPath);
  }
  files.sort((a, b) => a.localeCompare(b));
  return files;
};

const toSourceAssetPath = (absPath) => {
  const relativeToSourceAssets = path.relative(SOURCE_ASSETS_ROOT, absPath);
  const normalized = toPosixPath(relativeToSourceAssets);
  if (normalized.startsWith("..")) {
    throw new Error(`Asset source path is outside assets-source/: ${absPath}`);
  }
  return toPosixPath(path.join("assets", normalized));
};

const toOutputAssetPath = (absPath) => {
  const relativeToPublic = path.relative(PUBLIC_ROOT, absPath);
  const normalized = toPosixPath(relativeToPublic);
  if (normalized.startsWith("..")) {
    throw new Error(`Asset path is outside public/: ${absPath}`);
  }
  return normalized;
};

const optimizeImageAsset = async (sourceAbsPath, maxDimension, toolState) => {
  if (!(await fileExists(sourceAbsPath))) {
    console.warn(`[assets] skipped missing source: ${sourceAbsPath}`);
    return null;
  }
  const sourceExt = path.extname(sourceAbsPath).toLowerCase();
  const relativeToAssets = path.relative(SOURCE_ASSETS_ROOT, sourceAbsPath);
  const relativeWithoutExt = relativeToAssets.slice(0, -sourceExt.length);
  const outputBaseAbsPath = path.join(GENERATED_ASSETS_ROOT, relativeWithoutExt);
  await fsp.mkdir(path.dirname(outputBaseAbsPath), { recursive: true });

  let outputRasterAbsPath = `${outputBaseAbsPath}${sourceExt}`;
  if (toolState.hasSips) {
    outputRasterAbsPath = `${outputBaseAbsPath}.png`;
    const sipsResult = await runCommand("sips", [
      "-s",
      "format",
      "png",
      "--resampleHeightWidthMax",
      String(maxDimension),
      sourceAbsPath,
      "--out",
      outputRasterAbsPath
    ]);
    if (sipsResult.code !== 0) {
      outputRasterAbsPath = `${outputBaseAbsPath}${sourceExt}`;
      try {
        await fsp.copyFile(sourceAbsPath, outputRasterAbsPath);
      } catch (error) {
        if (error?.code === "ENOENT") {
          console.warn(`[assets] skipped vanished source during copy: ${sourceAbsPath}`);
          return null;
        }
        throw error;
      }
    }
  } else {
    try {
      await fsp.copyFile(sourceAbsPath, outputRasterAbsPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        console.warn(`[assets] skipped vanished source during copy: ${sourceAbsPath}`);
        return null;
      }
      throw error;
    }
  }

  let preferredOutputAbsPath = outputRasterAbsPath;
  if (toolState.hasCwebp) {
    const outputWebpAbsPath = `${outputBaseAbsPath}.webp`;
    const cwebpResult = await runCommand("cwebp", ["-quiet", "-q", "84", outputRasterAbsPath, "-o", outputWebpAbsPath]);
    if (cwebpResult.code === 0) {
      preferredOutputAbsPath = outputWebpAbsPath;
    }
  }

  return {
    sourcePath: toSourceAssetPath(sourceAbsPath),
    outputPath: toOutputAssetPath(preferredOutputAbsPath)
  };
};

const parsePlantSpeciesMeta = (sourceCode) => {
  const species = [];
  const pattern = /{\s*id:\s*"([^"]+)"[\s\S]*?nameKo:\s*"([^"]+)"/g;
  let match = pattern.exec(sourceCode);
  while (match) {
    species.push({
      id: match[1],
      nameKo: match[2]
    });
    match = pattern.exec(sourceCode);
  }
  return species;
};

const parsePotMeta = (sourceCode) => {
  const pots = [];
  const pattern = /{\s*id:\s*"([^"]+)",\s*nameKo:\s*"([^"]+)"/g;
  let match = pattern.exec(sourceCode);
  while (match) {
    pots.push({
      id: match[1],
      nameKo: match[2]
    });
    match = pattern.exec(sourceCode);
  }
  return pots;
};

const scorePlantCandidate = (candidateBase, speciesIdNorm, speciesShortNorm, speciesNameNorm, aliasNorms) => {
  if (!candidateBase) {
    return 0;
  }
  if (aliasNorms.has(candidateBase)) {
    return 500;
  }
  if (candidateBase === speciesIdNorm) {
    return 420;
  }
  if (candidateBase === speciesShortNorm) {
    return 380;
  }
  if (speciesNameNorm && candidateBase === speciesNameNorm) {
    return 350;
  }
  if (candidateBase.startsWith(speciesIdNorm)) {
    return 280;
  }
  if (candidateBase.startsWith(speciesShortNorm)) {
    return 240;
  }
  if (speciesNameNorm && candidateBase.startsWith(speciesNameNorm)) {
    return 220;
  }
  if (speciesShortNorm.length >= 4 && candidateBase.includes(speciesShortNorm)) {
    return 130;
  }
  if (speciesNameNorm && speciesNameNorm.length >= 2 && candidateBase.includes(speciesNameNorm)) {
    return 120;
  }
  return 0;
};

const buildPlantImageMap = (speciesMeta, candidateFiles, sourceToOptimized) => {
  const candidates = candidateFiles.map((absPath) => {
    const ext = path.extname(absPath);
    const fileBase = path.basename(absPath, ext);
    const publicPath = toSourceAssetPath(absPath);
    return {
      publicPath,
      normalizedBase: normalizeToken(fileBase)
    };
  });

  const plantMap = {};
  const unmatchedSpeciesIds = [];
  for (const species of speciesMeta) {
    const idNorm = normalizeToken(species.id);
    const shortNorm = normalizeToken(species.id.replace(/^plant_/, ""));
    const nameNorm = normalizeToken(species.nameKo);
    const aliasNorms = new Set((PLANT_FILE_ALIASES[species.id] ?? []).map(normalizeToken).filter(Boolean));
    let winner = null;
    for (const candidate of candidates) {
      const baseScore = scorePlantCandidate(candidate.normalizedBase, idNorm, shortNorm, nameNorm, aliasNorms);
      if (baseScore <= 0) {
        continue;
      }
      const score = baseScore;
      if (!winner || score > winner.score || (score === winner.score && candidate.publicPath < winner.candidate.publicPath)) {
        winner = { candidate, score };
      }
    }
    if (!winner) {
      unmatchedSpeciesIds.push(species.id);
      continue;
    }
    plantMap[species.id] = sourceToOptimized[winner.candidate.publicPath] ?? winner.candidate.publicPath;
  }

  return { plantMap, unmatchedSpeciesIds };
};

const scorePotCandidate = (candidateBase, potIdNorm, potShortNorm, potNameNorm, aliasNorms) => {
  if (!candidateBase) {
    return 0;
  }
  if (aliasNorms.has(candidateBase)) {
    return 500;
  }
  for (const aliasNorm of aliasNorms) {
    if (aliasNorm.length >= 3 && candidateBase.includes(aliasNorm)) {
      return 340;
    }
  }
  if (candidateBase === potIdNorm) {
    return 420;
  }
  if (candidateBase === potShortNorm) {
    return 380;
  }
  if (potNameNorm && candidateBase === potNameNorm) {
    return 350;
  }
  if (candidateBase.startsWith(potIdNorm)) {
    return 260;
  }
  if (candidateBase.startsWith(potShortNorm)) {
    return 230;
  }
  if (potNameNorm && candidateBase.startsWith(potNameNorm)) {
    return 220;
  }
  if (potShortNorm.length >= 3 && candidateBase.includes(potShortNorm)) {
    return 120;
  }
  if (potNameNorm && potNameNorm.length >= 2 && candidateBase.includes(potNameNorm)) {
    return 110;
  }
  return 0;
};

const buildPotImageMap = (potMeta, candidateFiles, sourceToOptimized) => {
  const candidates = candidateFiles.map((absPath) => {
    const ext = path.extname(absPath);
    const fileBase = path.basename(absPath, ext);
    const publicPath = toSourceAssetPath(absPath);
    return {
      publicPath,
      normalizedBase: normalizeToken(fileBase)
    };
  });

  const potMap = {};
  const unmatchedPotIds = [];
  for (const pot of potMeta) {
    const idNorm = normalizeToken(pot.id);
    const shortNorm = normalizeToken(pot.id.replace(/^pot_/, ""));
    const nameNorm = normalizeToken(pot.nameKo);
    const aliasNorms = new Set((POT_FILE_ALIASES[pot.id] ?? []).map(normalizeToken).filter(Boolean));
    let winner = null;
    for (const candidate of candidates) {
      const score = scorePotCandidate(candidate.normalizedBase, idNorm, shortNorm, nameNorm, aliasNorms);
      if (score <= 0) {
        continue;
      }
      if (!winner || score > winner.score || (score === winner.score && candidate.publicPath < winner.candidate.publicPath)) {
        winner = { candidate, score };
      }
    }
    if (!winner) {
      unmatchedPotIds.push(pot.id);
      continue;
    }
    potMap[pot.id] = sourceToOptimized[winner.candidate.publicPath] ?? winner.candidate.publicPath;
  }

  return { potMap, unmatchedPotIds };
};

const detectSproutStageFromPath = (filePath) => {
  const baseName = path.basename(filePath, path.extname(filePath)).toLowerCase();
  const match = baseName.match(/([1-4])/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
};

const buildSproutStageMap = (sproutFiles, sourceToOptimized) => {
  const stageMap = {};
  const bestByStage = new Map();
  for (const filePath of sproutFiles) {
    const stage = detectSproutStageFromPath(filePath);
    if (!stage || stage < 1 || stage > 4) {
      continue;
    }
    const publicPath = toSourceAssetPath(filePath);
    const existing = bestByStage.get(stage);
    if (!existing || publicPath < existing.publicPath) {
      bestByStage.set(stage, { publicPath });
    }
  }
  for (const stage of [1, 2, 3, 4]) {
    const picked = bestByStage.get(stage);
    if (!picked) {
      continue;
    }
    stageMap[String(stage)] = sourceToOptimized[picked.publicPath] ?? picked.publicPath;
  }
  return stageMap;
};

const runPipelineOnce = async () => {
  const toolState = {
    hasSips: await commandExists("sips"),
    hasCwebp: await commandExists("cwebp")
  };

  await fsp.rm(GENERATED_ASSETS_ROOT, { recursive: true, force: true });
  await fsp.mkdir(GENERATED_ASSETS_ROOT, { recursive: true });
  await fsp.mkdir(path.dirname(GENERATED_MAP_PATH), { recursive: true });

  const sourceToOptimized = {};
  const filesByGroupName = {};
  for (const group of PIPELINE_GROUPS) {
    const files = await walkImageFiles(group.sourceDir);
    filesByGroupName[group.name] = files;
    for (const filePath of files) {
      const optimized = await optimizeImageAsset(filePath, group.maxDimension, toolState);
      if (!optimized) {
        continue;
      }
      sourceToOptimized[optimized.sourcePath] = optimized.outputPath;
    }
  }

  const plantsSourceCode = await fsp.readFile(PLANTS_SOURCE_PATH, "utf8");
  const speciesMeta = parsePlantSpeciesMeta(plantsSourceCode);
  const { plantMap, unmatchedSpeciesIds } = buildPlantImageMap(
    speciesMeta,
    filesByGroupName.plants ?? [],
    sourceToOptimized
  );
  const potsSourceCode = await fsp.readFile(POTS_SOURCE_PATH, "utf8");
  const potMeta = parsePotMeta(potsSourceCode);
  const { potMap, unmatchedPotIds } = buildPotImageMap(potMeta, filesByGroupName.pots ?? [], sourceToOptimized);
  const sproutStageMap = buildSproutStageMap(filesByGroupName.sprout ?? [], sourceToOptimized);

  const outputMap = {
    version: 1,
    generatedAt: new Date().toISOString(),
    toolState,
    sourceToOptimized,
    plantsBySpeciesId: plantMap,
    potsByPotId: potMap,
    sproutStageImagePathByStage: sproutStageMap
  };

  await fsp.writeFile(GENERATED_MAP_PATH, `${JSON.stringify(outputMap, null, 2)}\n`, "utf8");

  const optimizedCount = Object.keys(sourceToOptimized).length;
  const matchedPlantCount = Object.keys(plantMap).length;
  const matchedPotCount = Object.keys(potMap).length;
  const sproutCount = Object.keys(sproutStageMap).length;
  const unmatchedSummary = unmatchedSpeciesIds.length > 0 ? `, unmatched plants ${unmatchedSpeciesIds.length}` : "";
  const unmatchedPotSummary = unmatchedPotIds.length > 0 ? `, unmatched pots ${unmatchedPotIds.length}` : "";
  console.log(
    `[assets] optimized ${optimizedCount} files, mapped plants ${matchedPlantCount}${unmatchedSummary}, mapped pots ${matchedPotCount}${unmatchedPotSummary}, sprout stages ${sproutCount}`
  );

  if (!toolState.hasCwebp) {
    console.log("[assets] cwebp not found: using optimized PNG fallback only.");
  }
  if (!toolState.hasSips) {
    console.log("[assets] sips not found: copying source images without resize.");
  }
};

const startWatchMode = async () => {
  await runPipelineOnce();
  const watchTargets = PIPELINE_GROUPS.map((group) => group.sourceDir);

  let timer = null;
  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(async () => {
      try {
        await runPipelineOnce();
      } catch (error) {
        console.error(`[assets] pipeline failed: ${String(error?.stack ?? error)}`);
      }
    }, 220);
  };

  const watchers = [];
  for (const target of await Promise.all(
    watchTargets.map(async (dirPath) => ({ dirPath, exists: await fileExists(dirPath) }))
  )) {
    if (!target.exists) {
      continue;
    }
    const watcher = fs.watch(target.dirPath, { recursive: true }, (_eventType, filename) => {
      if (!filename) {
        schedule();
        return;
      }
      if (String(filename).startsWith(".")) {
        return;
      }
      schedule();
    });
    watchers.push(watcher);
  }

  console.log("[assets] watch mode enabled.");

  const stopWatchers = () => {
    for (const watcher of watchers) {
      watcher.close();
    }
    process.exit(0);
  };

  process.on("SIGINT", stopWatchers);
  process.on("SIGTERM", stopWatchers);
};

if (isWatchMode) {
  startWatchMode().catch((error) => {
    console.error(`[assets] watch bootstrap failed: ${String(error?.stack ?? error)}`);
    process.exit(1);
  });
} else {
  runPipelineOnce().catch((error) => {
    console.error(`[assets] pipeline failed: ${String(error?.stack ?? error)}`);
    process.exit(1);
  });
}
