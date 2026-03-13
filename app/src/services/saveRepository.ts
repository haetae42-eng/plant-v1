import { BACKGROUND_DEFS } from "../content/backgrounds";
import { PLANT_SPECIES_DEFS } from "../content/plants";
import { POT_DEFS } from "../content/pots";
import {
  DECOR_DISPLAY_PAGE_COUNT,
  DECOR_DISPLAY_SLOT_LAYOUT,
  GARDEN_SLOT_COUNT,
  SAVE_DEBOUNCE_MS,
  SAVE_SCHEMA_VERSION,
  SAVE_STORAGE_KEY
} from "../domain/constants";
import { createDefaultSaveData } from "../domain/defaultSave";
import {
  DecorDisplaySlotState,
  DecorItemType,
  DecorPlacement,
  GardenSlotPlantState,
  GardenSlotState,
  SaveDataV1
} from "../domain/types";

export interface SaveRepository {
  load(): SaveDataV1;
  saveDebounced(saveData: SaveDataV1): void;
  flush(): void;
  clear(): void;
}

type TimerHandle = ReturnType<typeof setTimeout>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toSafeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toUniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.filter((item) => typeof item === "string")));
}

function normalizePlantState(value: unknown): GardenSlotPlantState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.speciesId !== "string") {
    return null;
  }

  return {
    speciesId: value.speciesId,
    plantedAt: toSafeNumber(value.plantedAt, Date.now()),
    growSeconds: Math.max(1, toSafeNumber(value.growSeconds, 60)),
    harvested: Boolean(value.harvested)
  };
}

function normalizeSlots(value: unknown, fallbackPotId: string): GardenSlotState[] {
  if (!Array.isArray(value)) {
    return Array.from({ length: GARDEN_SLOT_COUNT }, (_, index) => ({
      slotId: `slot-${String(index + 1).padStart(2, "0")}`,
      potId: fallbackPotId,
      planted: null
    }));
  }

  const baseSlots = Array.from({ length: GARDEN_SLOT_COUNT }, (_, index) => ({
    slotId: `slot-${String(index + 1).padStart(2, "0")}`,
    potId: fallbackPotId,
    planted: null
  }));

  return baseSlots.map((slot, index) => {
    const candidate = value[index];
    if (!isRecord(candidate)) {
      return slot;
    }
    return {
      slotId: typeof candidate.slotId === "string" ? candidate.slotId : slot.slotId,
      potId: typeof candidate.potId === "string" ? candidate.potId : slot.potId,
      planted: normalizePlantState(candidate.planted)
    };
  });
}

function normalizeDecorItemType(value: unknown): DecorItemType | null {
  if (value === "flower" || value === "pot") {
    return value;
  }
  return null;
}

function normalizeDecorItems(value: unknown): DecorPlacement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: DecorPlacement[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      continue;
    }
    const itemType = normalizeDecorItemType(candidate.itemType);
    if (!itemType || typeof candidate.refId !== "string" || typeof candidate.id !== "string") {
      continue;
    }
    items.push({
      id: candidate.id,
      itemType,
      refId: candidate.refId,
      x: toSafeNumber(candidate.x, 195),
      y: toSafeNumber(candidate.y, 380)
    });
  }
  return items;
}

function normalizeDecorDisplayFlowerCounts(value: unknown, fallback: Record<string, number>): Record<string, number> {
  const raw = isRecord(value) ? value : {};
  return Object.fromEntries(
    PLANT_SPECIES_DEFS.map((species) => [
      species.id,
      Math.min(1, Math.max(0, Math.floor(toSafeNumber(raw[species.id], fallback[species.id] ?? 0))))
    ])
  );
}

function normalizeDecorDisplaySlots(value: unknown, fallbackPotId: string): {
  slots: DecorDisplaySlotState[];
  droppedSpeciesIds: string[];
} {
  const candidateByPageSlotKey = new Map<string, Record<string, unknown>>();
  const validSpeciesIds = new Set(PLANT_SPECIES_DEFS.map((species) => species.id));
  const validSlotIds = new Set<string>(DECOR_DISPLAY_SLOT_LAYOUT.map((layout) => layout.slotId));
  const validPotIds = new Set<string>(POT_DEFS.map((pot) => pot.id));
  const droppedSpeciesIds: string[] = [];

  if (Array.isArray(value)) {
    for (const candidate of value) {
      if (!isRecord(candidate) || typeof candidate.slotId !== "string") {
        continue;
      }

      const rawPage = typeof candidate.page === "number" && Number.isFinite(candidate.page) ? Math.floor(candidate.page) : 0;
      const hasValidLayout = validSlotIds.has(candidate.slotId);
      const hasValidPage = rawPage >= 0 && rawPage < DECOR_DISPLAY_PAGE_COUNT;
      if (!hasValidLayout || !hasValidPage) {
        const speciesIdRaw = candidate.speciesId;
        if (typeof speciesIdRaw === "string" && validSpeciesIds.has(speciesIdRaw)) {
          droppedSpeciesIds.push(speciesIdRaw);
        }
        continue;
      }
      candidateByPageSlotKey.set(`${rawPage}:${candidate.slotId}`, candidate);
    }
  }

  const slots: DecorDisplaySlotState[] = [];
  for (let pageIndex = 0; pageIndex < DECOR_DISPLAY_PAGE_COUNT; pageIndex += 1) {
    for (const layout of DECOR_DISPLAY_SLOT_LAYOUT) {
      const candidate = candidateByPageSlotKey.get(`${pageIndex}:${layout.slotId}`);
      const speciesIdRaw = candidate?.speciesId;
      const speciesId = typeof speciesIdRaw === "string" && validSpeciesIds.has(speciesIdRaw) ? speciesIdRaw : null;
      const potIdRaw = candidate?.potId;
      const potId = typeof potIdRaw === "string" && validPotIds.has(potIdRaw) ? potIdRaw : fallbackPotId;
      slots.push({
        slotId: layout.slotId,
        layer: layout.layer,
        page: pageIndex,
        potId,
        speciesId
      });
    }
  }

  return {
    slots,
    droppedSpeciesIds
  };
}

export function normalizeSaveData(raw: unknown): SaveDataV1 | null {
  if (!isRecord(raw) || raw.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return null;
  }

  const now = Date.now();
  const fallback = createDefaultSaveData(now);

  const player = isRecord(raw.player) ? raw.player : {};
  const garden = isRecord(raw.garden) ? raw.garden : {};
  const decor = isRecord(raw.decor) ? raw.decor : {};
  const attendance = isRecord(raw.attendance) ? raw.attendance : {};
  const inventory = isRecord(raw.inventory) ? raw.inventory : {};
  const collection = isRecord(raw.collection) ? raw.collection : {};
  const clicker = isRecord(raw.clicker) ? raw.clicker : {};
  const settings = isRecord(raw.settings) ? raw.settings : {};

  const seedCountsRaw = isRecord(inventory.seedCounts) ? inventory.seedCounts : {};
  const seedCounts = Object.fromEntries(
    PLANT_SPECIES_DEFS.map((species) => [
      species.id,
      Math.max(0, Math.floor(toSafeNumber(seedCountsRaw[species.id], fallback.inventory.seedCounts[species.id] ?? 0)))
    ])
  );
  const flowerCountsRaw = isRecord(collection.flowerCounts) ? collection.flowerCounts : {};
  const flowerCounts = Object.fromEntries(
    PLANT_SPECIES_DEFS.map((species) => [
      species.id,
      Math.min(1, Math.max(0, Math.floor(toSafeNumber(flowerCountsRaw[species.id], fallback.collection.flowerCounts[species.id] ?? 0))))
    ])
  );
  const plantNicknamesRaw = isRecord(collection.plantNicknames) ? collection.plantNicknames : {};
  const plantNicknames = Object.fromEntries(
    PLANT_SPECIES_DEFS.map((species) => {
      const rawNickname = plantNicknamesRaw[species.id];
      const normalizedNickname = typeof rawNickname === "string" ? Array.from(rawNickname.trim()).slice(0, 5).join("") : "";
      return [species.id, normalizedNickname];
    })
  );

  const primaryPotId = POT_DEFS[0]?.id ?? fallback.garden.slots[0]?.potId ?? "pot_default";
  const primaryBackgroundId =
    BACKGROUND_DEFS.find((background) => background.id === "bg_sunset")?.id ??
    BACKGROUND_DEFS[0]?.id ??
    fallback.garden.backgroundId;

  const displayFlowerCounts = normalizeDecorDisplayFlowerCounts(
    decor.displayFlowerCounts,
    fallback.decor.displayFlowerCounts
  );
  const normalizedDisplay = normalizeDecorDisplaySlots(decor.displaySlots, primaryPotId);
  const displaySlots = normalizedDisplay.slots;
  normalizedDisplay.droppedSpeciesIds.forEach((speciesId) => {
    displayFlowerCounts[speciesId] = 1;
  });

  const ownedPotIds = toUniqueStringArray(collection.ownedPotIds);
  const ownedBackgroundIds = toUniqueStringArray(collection.ownedBackgroundIds);

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    player: {
      coins: Math.max(0, Math.floor(toSafeNumber(player.coins, fallback.player.coins))),
      gems: Math.max(0, Math.floor(toSafeNumber(player.gems, fallback.player.gems))),
      createdAt: toSafeNumber(player.createdAt, fallback.player.createdAt),
      lastActiveAt: toSafeNumber(player.lastActiveAt, now),
      language: "ko"
    },
    garden: {
      backgroundId:
        typeof garden.backgroundId === "string" && garden.backgroundId.length > 0
          ? garden.backgroundId
          : primaryBackgroundId,
      slots: normalizeSlots(garden.slots, primaryPotId)
    },
    decor: {
      items: normalizeDecorItems(decor.items),
      nextItemId: Math.max(1, Math.floor(toSafeNumber(decor.nextItemId, fallback.decor.nextItemId))),
      displayFlowerCounts,
      displaySlots,
      goalReward: isRecord(decor.goalReward)
        ? {
            lastClaimedPeriodKey:
              typeof decor.goalReward.lastClaimedPeriodKey === "string" &&
              decor.goalReward.lastClaimedPeriodKey.length > 0
                ? decor.goalReward.lastClaimedPeriodKey
                : null,
            claimedTier: Math.max(0, Math.floor(toSafeNumber(decor.goalReward.claimedTier, 0)))
          }
        : {
            lastClaimedPeriodKey: null,
            claimedTier: 0
          }
    },
    attendance: {
      cycleDay: Math.max(0, Math.min(6, Math.floor(toSafeNumber(attendance.cycleDay, fallback.attendance.cycleDay)))),
      lastClaimedPeriodKey:
        typeof attendance.lastClaimedPeriodKey === "string" && attendance.lastClaimedPeriodKey.length > 0
          ? attendance.lastClaimedPeriodKey
          : null,
      unlockClaimedDays: Array.isArray(attendance.unlockClaimedDays)
        ? Array.from(
            new Set(
              attendance.unlockClaimedDays
                .map((day) => Math.floor(toSafeNumber(day, 0)))
                .filter((day) => day >= 1 && day <= 7)
            )
          )
        : []
    },
    inventory: {
      seedCounts
    },
    collection: {
      discoveredSpeciesIds: toUniqueStringArray(collection.discoveredSpeciesIds),
      ownedPotIds: ownedPotIds.length > 0 ? ownedPotIds : [primaryPotId],
      ownedBackgroundIds: ownedBackgroundIds.length > 0 ? ownedBackgroundIds : [primaryBackgroundId],
      flowerCounts,
      plantNicknames,
      claimedSetRewardIds: Array.isArray(collection.claimedSetRewardIds)
        ? toUniqueStringArray(collection.claimedSetRewardIds)
        : fallback.collection.claimedSetRewardIds
    },
    clicker: {
      tapPower: Math.max(1, Math.floor(toSafeNumber(clicker.tapPower, fallback.clicker.tapPower))),
      autoCoinsPerSec: Math.max(0, Math.floor(toSafeNumber(clicker.autoCoinsPerSec, fallback.clicker.autoCoinsPerSec))),
      growthBoostSeconds: Math.max(
        1,
        Math.floor(toSafeNumber(clicker.growthBoostSeconds, fallback.clicker.growthBoostSeconds))
      ),
      tapUpgradeLevel: Math.max(1, Math.floor(toSafeNumber(clicker.tapUpgradeLevel, fallback.clicker.tapUpgradeLevel))),
      autoUpgradeLevel: Math.max(0, Math.floor(toSafeNumber(clicker.autoUpgradeLevel, fallback.clicker.autoUpgradeLevel))),
      boostUpgradeLevel: Math.max(
        1,
        Math.floor(toSafeNumber(clicker.boostUpgradeLevel, fallback.clicker.boostUpgradeLevel))
      )
    },
    settings: {
      sfxOn: typeof settings.sfxOn === "boolean" ? settings.sfxOn : fallback.settings.sfxOn,
      bgmOn: typeof settings.bgmOn === "boolean" ? settings.bgmOn : fallback.settings.bgmOn,
      homePotTintIndex: Math.max(0, Math.floor(toSafeNumber(settings.homePotTintIndex, fallback.settings.homePotTintIndex))),
      homeWindowOpen: typeof settings.homeWindowOpen === "boolean" ? settings.homeWindowOpen : fallback.settings.homeWindowOpen
    }
  };
}

export class LocalStorageSaveRepository implements SaveRepository {
  private readonly storageKey: string;
  private readonly backupStorageKey: string;
  private readonly debounceMs: number;
  private timer: TimerHandle | null = null;
  private pending: SaveDataV1 | null = null;

  constructor(storageKey = SAVE_STORAGE_KEY, debounceMs = SAVE_DEBOUNCE_MS) {
    this.storageKey = storageKey;
    this.backupStorageKey = `${storageKey}.backup`;
    this.debounceMs = debounceMs;
  }

  private loadFromStorage(storageKey: string): SaveDataV1 | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as unknown;
      return normalizeSaveData(parsed);
    } catch {
      return null;
    }
  }

  load(): SaveDataV1 {
    if (typeof window === "undefined") {
      return createDefaultSaveData();
    }

    const primary = this.loadFromStorage(this.storageKey);
    if (primary) {
      return primary;
    }

    try {
      const backup = this.loadFromStorage(this.backupStorageKey);
      if (backup) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(backup));
        return backup;
      }
    } catch {
      // Ignore recovery write failures and fallback to default save.
    }

    return createDefaultSaveData();
  }

  saveDebounced(saveData: SaveDataV1): void {
    this.pending = saveData;
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  flush(): void {
    if (!this.pending || typeof window === "undefined") {
      return;
    }

    try {
      const currentRaw = window.localStorage.getItem(this.storageKey);
      if (currentRaw) {
        window.localStorage.setItem(this.backupStorageKey, currentRaw);
      }
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.pending));
      this.pending = null;
    } catch {
      // Keep pending data so next flush can retry when storage is available.
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  clear(): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(this.storageKey);
    window.localStorage.removeItem(this.backupStorageKey);
    this.pending = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
