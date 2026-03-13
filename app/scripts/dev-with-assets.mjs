#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const viteBinName = process.platform === "win32" ? "vite.cmd" : "vite";
const localViteBin = path.join(APP_ROOT, "node_modules", ".bin", viteBinName);
const workspaceViteBin = path.resolve(APP_ROOT, "..", "node_modules", ".bin", viteBinName);
const VITE_BIN = existsSync(localViteBin) ? localViteBin : workspaceViteBin;
const ASSET_PIPELINE_SCRIPT = path.join(SCRIPT_DIR, "assets-pipeline.mjs");
const viteArgs = process.argv.slice(2);
let exiting = false;
const shouldWatchAssets = process.env.ASSETS_WATCH === "1";

const initialSync = spawnSync(process.execPath, [ASSET_PIPELINE_SCRIPT], {
  cwd: APP_ROOT,
  stdio: "inherit"
});
if ((initialSync.status ?? 1) !== 0) {
  process.exit(initialSync.status ?? 1);
}

const assetWatcher = shouldWatchAssets
  ? spawn(process.execPath, [ASSET_PIPELINE_SCRIPT, "--watch"], {
      cwd: APP_ROOT,
      stdio: "inherit"
    })
  : null;

const viteProcess = spawn(VITE_BIN, viteArgs, {
  cwd: APP_ROOT,
  stdio: "inherit"
});

const shutdown = () => {
  if (exiting) {
    return;
  }
  exiting = true;
  if (assetWatcher && !assetWatcher.killed) {
    assetWatcher.kill("SIGTERM");
  }
  if (!viteProcess.killed) {
    viteProcess.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (assetWatcher) {
  assetWatcher.on("error", (error) => {
    console.error(`[assets] watcher failed: ${String(error?.message ?? error)}`);
    shutdown();
    process.exit(1);
  });

  assetWatcher.on("close", (code) => {
    if ((code ?? 0) === 0 || viteProcess.killed) {
      return;
    }
    console.error(`[assets] watcher exited with code ${code ?? 1}`);
    if (!viteProcess.killed) {
      viteProcess.kill("SIGTERM");
    }
    process.exit(code ?? 1);
  });
}

viteProcess.on("error", (error) => {
  console.error(`[vite] process failed: ${String(error?.message ?? error)}`);
  shutdown();
  process.exit(1);
});

viteProcess.on("close", (code) => {
  shutdown();
  process.exit(code ?? 0);
});
