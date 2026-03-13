import { describe, expect, test } from "vitest";

import { PLANT_SPECIES_DEFS } from "../content/plants";
import { DECOR_DISPLAY_PAGE_COUNT, DECOR_DISPLAY_SLOT_LAYOUT } from "../domain/constants";
import { createDefaultSaveData } from "../domain/defaultSave";
import { LocalStorageSaveRepository, normalizeSaveData } from "./saveRepository";

type StorageMap = Map<string, string>;

function createMemoryWindow(initial: Record<string, string> = {}): {
  windowLike: Window;
  storage: StorageMap;
} {
  const storage = new Map<string, string>(Object.entries(initial));
  const localStorageLike = {
    getItem(key: string): string | null {
      return storage.has(key) ? storage.get(key) ?? null : null;
    },
    setItem(key: string, value: string): void {
      storage.set(key, String(value));
    },
    removeItem(key: string): void {
      storage.delete(key);
    }
  };
  return {
    windowLike: {
      localStorage: localStorageLike
    } as unknown as Window,
    storage
  };
}

describe("normalizeSaveData (decor display regression)", () => {
  test("schema mismatch returns null", () => {
    const fallback = createDefaultSaveData(1000) as unknown as Record<string, unknown>;
    const raw = {
      ...fallback,
      schemaVersion: 999
    };
    expect(normalizeSaveData(raw)).toBeNull();
  });

  test("invalid page slot species is dropped and returned to display stock", () => {
    const base = createDefaultSaveData(1000);
    const speciesId = PLANT_SPECIES_DEFS[0]?.id;
    const defaultPotId = base.garden.slots[0]?.potId;
    expect(speciesId).toBeTruthy();
    expect(defaultPotId).toBeTruthy();
    if (!speciesId || !defaultPotId) {
      return;
    }

    const raw = structuredClone(base);
    if (!raw.collection.discoveredSpeciesIds.includes(speciesId)) {
      raw.collection.discoveredSpeciesIds.push(speciesId);
    }
    raw.decor.displayFlowerCounts[speciesId] = 0;
    raw.decor.displaySlots = [
      {
        slotId: DECOR_DISPLAY_SLOT_LAYOUT[0].slotId,
        layer: DECOR_DISPLAY_SLOT_LAYOUT[0].layer,
        page: 0,
        potId: defaultPotId,
        speciesId: null
      },
      {
        slotId: DECOR_DISPLAY_SLOT_LAYOUT[0].slotId,
        layer: DECOR_DISPLAY_SLOT_LAYOUT[0].layer,
        page: 99,
        potId: defaultPotId,
        speciesId
      }
    ];

    const normalized = normalizeSaveData(raw);
    expect(normalized).not.toBeNull();
    if (!normalized) {
      return;
    }

    expect(normalized.decor.displaySlots).toHaveLength(DECOR_DISPLAY_PAGE_COUNT * DECOR_DISPLAY_SLOT_LAYOUT.length);
    expect(normalized.decor.displayFlowerCounts[speciesId]).toBe(1);
  });

  test("valid slot assignment is preserved across normalization", () => {
    const base = createDefaultSaveData(1000);
    const speciesId = PLANT_SPECIES_DEFS[1]?.id ?? PLANT_SPECIES_DEFS[0]?.id;
    const defaultPotId = base.garden.slots[0]?.potId;
    expect(speciesId).toBeTruthy();
    expect(defaultPotId).toBeTruthy();
    if (!speciesId || !defaultPotId) {
      return;
    }

    const raw = structuredClone(base);
    if (!raw.collection.discoveredSpeciesIds.includes(speciesId)) {
      raw.collection.discoveredSpeciesIds.push(speciesId);
    }
    raw.decor.displayFlowerCounts[speciesId] = 0;
    raw.decor.displaySlots = [
      {
        slotId: DECOR_DISPLAY_SLOT_LAYOUT[0].slotId,
        layer: DECOR_DISPLAY_SLOT_LAYOUT[0].layer,
        page: 0,
        potId: defaultPotId,
        speciesId
      }
    ];

    const normalized = normalizeSaveData(raw);
    expect(normalized).not.toBeNull();
    if (!normalized) {
      return;
    }

    const target = normalized.decor.displaySlots.find(
      (slot) => slot.page === 0 && slot.slotId === DECOR_DISPLAY_SLOT_LAYOUT[0].slotId
    );
    expect(target?.speciesId).toBe(speciesId);
    expect(normalized.decor.displayFlowerCounts[speciesId]).toBe(0);
  });
});

describe("LocalStorageSaveRepository (backup recovery)", () => {
  test("loads backup save when primary save is broken", () => {
    const storageKey = "test.save.backup-recovery";
    const backupSave = createDefaultSaveData(1234);
    const memory = createMemoryWindow({
      [storageKey]: "{broken-json",
      [`${storageKey}.backup`]: JSON.stringify(backupSave)
    });
    const globalWindow = globalThis as unknown as { window?: Window };
    const originalWindow = globalWindow.window;
    globalWindow.window = memory.windowLike;

    try {
      const repository = new LocalStorageSaveRepository(storageKey, 0);
      const loaded = repository.load();
      expect(loaded.player.createdAt).toBe(backupSave.player.createdAt);
      expect(loaded.player.coins).toBe(backupSave.player.coins);
    } finally {
      globalWindow.window = originalWindow;
    }
  });

  test("flush keeps one previous save in backup key", () => {
    const storageKey = "test.save.backup-rotate";
    const previous = createDefaultSaveData(1000);
    previous.player.coins = 111;
    const next = createDefaultSaveData(2000);
    next.player.coins = 222;
    const memory = createMemoryWindow({
      [storageKey]: JSON.stringify(previous)
    });
    const globalWindow = globalThis as unknown as { window?: Window };
    const originalWindow = globalWindow.window;
    globalWindow.window = memory.windowLike;

    try {
      const repository = new LocalStorageSaveRepository(storageKey, 0);
      repository.saveDebounced(next);
      repository.flush();

      const savedPrimaryRaw = memory.storage.get(storageKey);
      const savedBackupRaw = memory.storage.get(`${storageKey}.backup`);
      expect(savedPrimaryRaw).toBeTruthy();
      expect(savedBackupRaw).toBeTruthy();
      if (!savedPrimaryRaw || !savedBackupRaw) {
        return;
      }

      const savedPrimary = JSON.parse(savedPrimaryRaw) as { player: { coins: number } };
      const savedBackup = JSON.parse(savedBackupRaw) as { player: { coins: number } };
      expect(savedPrimary.player.coins).toBe(222);
      expect(savedBackup.player.coins).toBe(111);
    } finally {
      globalWindow.window = originalWindow;
    }
  });
});
