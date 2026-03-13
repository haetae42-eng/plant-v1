import { MAX_IDLE_SECONDS, MAX_PLAYER_COINS } from "../domain/constants";
import { GardenSlotPlantState, SaveDataV1 } from "../domain/types";

export type IdleProgressReport = {
  elapsedSeconds: number;
  effectiveNowMs: number;
  wasBackwardTime: boolean;
  wasCapped: boolean;
  maturedSlotIds: string[];
  passiveCoinsGained: number;
};

export type IdleProgressResult = {
  data: SaveDataV1;
  report: IdleProgressReport;
};

export function calculateElapsedSeconds(lastActiveAt: number, nowMs: number): IdleProgressReport {
  const rawElapsed = Math.floor((nowMs - lastActiveAt) / 1000);

  if (rawElapsed <= 0) {
    return {
      elapsedSeconds: 0,
      effectiveNowMs: lastActiveAt,
      wasBackwardTime: rawElapsed < 0,
      wasCapped: false,
      maturedSlotIds: [],
      passiveCoinsGained: 0
    };
  }

  const elapsedSeconds = Math.min(rawElapsed, MAX_IDLE_SECONDS);

  return {
    elapsedSeconds,
    effectiveNowMs: lastActiveAt + elapsedSeconds * 1000,
    wasBackwardTime: false,
    wasCapped: rawElapsed > MAX_IDLE_SECONDS,
    maturedSlotIds: [],
    passiveCoinsGained: 0
  };
}

export function getPlantElapsedSeconds(plant: GardenSlotPlantState, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - plant.plantedAt) / 1000));
}

export function getRemainingGrowSeconds(plant: GardenSlotPlantState, nowMs: number): number {
  const elapsed = getPlantElapsedSeconds(plant, nowMs);
  return Math.max(0, plant.growSeconds - elapsed);
}

export function isPlantHarvestable(plant: GardenSlotPlantState, nowMs: number): boolean {
  return getPlantElapsedSeconds(plant, nowMs) >= plant.growSeconds;
}

export function getPlantStage(plant: GardenSlotPlantState, nowMs: number): 0 | 1 | 2 | 3 | 4 {
  if (plant.harvested) {
    return 4;
  }

  const elapsed = getPlantElapsedSeconds(plant, nowMs);
  const progress = elapsed / plant.growSeconds;

  // 1단계 진입을 늦추되, 1→2 간격은 길지 않게 유지.
  const seedPhaseSeconds = Math.max(6, Math.min(32, Math.floor(plant.growSeconds * 0.2)));
  if (elapsed < seedPhaseSeconds) {
    return 0;
  }

  if (progress >= 1) {
    return 4;
  }
  if (progress >= 0.72) {
    return 3;
  }
  if (progress >= 0.34) {
    return 2;
  }
  return 1;
}

export function applyIdleProgress(current: SaveDataV1, nowMs: number): IdleProgressResult {
  const baseReport = calculateElapsedSeconds(current.player.lastActiveAt, nowMs);
  const maturedSlotIds: string[] = [];
  let passiveCoinsGained = 0;

  const next = structuredClone(current);

  if (baseReport.elapsedSeconds > 0) {
    const rawPassiveCoins = Math.max(0, Math.floor(current.clicker.autoCoinsPerSec * baseReport.elapsedSeconds));
    const currentCoins = Math.max(0, Math.floor(next.player.coins));
    const availableCapacity = Math.max(0, MAX_PLAYER_COINS - currentCoins);
    passiveCoinsGained = Math.min(rawPassiveCoins, availableCapacity);
    next.player.coins = currentCoins + passiveCoinsGained;

    for (const slot of next.garden.slots) {
      if (!slot.planted || slot.planted.harvested) {
        continue;
      }

      if (isPlantHarvestable(slot.planted, baseReport.effectiveNowMs)) {
        slot.planted.harvested = true;
        maturedSlotIds.push(slot.slotId);
      }
    }
  }

  next.player.lastActiveAt = Math.max(current.player.lastActiveAt, nowMs);

  return {
    data: next,
    report: {
      ...baseReport,
      maturedSlotIds,
      passiveCoinsGained
    }
  };
}
