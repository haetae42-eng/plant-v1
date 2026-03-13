import { describe, expect, it } from "vitest";
import { createDefaultSaveData } from "../domain/defaultSave";
import { applyIdleProgress, calculateElapsedSeconds } from "./idleProgressService";

describe("idleProgressService", () => {
  it("caps elapsed time at 8 hours when idle time is too long", () => {
    const base = createDefaultSaveData(1_700_000_000_000);
    base.player.lastActiveAt = 1_700_000_000_000;

    const result = calculateElapsedSeconds(base.player.lastActiveAt, base.player.lastActiveAt + 12 * 60 * 60 * 1000);

    expect(result.elapsedSeconds).toBe(8 * 60 * 60);
    expect(result.wasCapped).toBe(true);
  });

  it("blocks offline progress when device time moves backwards", () => {
    const base = createDefaultSaveData(1_700_000_000_000);
    base.player.lastActiveAt = 1_700_000_100_000;

    const result = applyIdleProgress(base, 1_700_000_050_000);

    expect(result.report.elapsedSeconds).toBe(0);
    expect(result.report.wasBackwardTime).toBe(true);
  });

  it("marks slot as harvestable after enough elapsed time", () => {
    const base = createDefaultSaveData(1_700_000_000_000);
    const slot = base.garden.slots[0];

    slot.planted = {
      speciesId: "plant_daisy",
      plantedAt: 1_700_000_000_000,
      growSeconds: 90,
      harvested: false
    };

    base.player.lastActiveAt = 1_700_000_000_000;

    const result = applyIdleProgress(base, 1_700_000_200_000);

    expect(result.data.garden.slots[0].planted?.harvested).toBe(true);
    expect(result.report.maturedSlotIds).toContain(slot.slotId);
  });

  it("does not auto-harvest; mature flowers remain until player harvests", () => {
    const base = createDefaultSaveData(1_700_000_000_000);
    const slot = base.garden.slots[1];

    slot.planted = {
      speciesId: "plant_tulip",
      plantedAt: 1_700_000_000_000,
      growSeconds: 120,
      harvested: false
    };

    base.player.lastActiveAt = 1_700_000_000_000;

    const result = applyIdleProgress(base, 1_700_000_500_000);

    expect(result.data.garden.slots[1].planted).not.toBeNull();
    expect(result.data.garden.slots[1].planted?.harvested).toBe(true);
  });

  it("grants passive coins while offline based on autoCoinsPerSec", () => {
    const base = createDefaultSaveData(1_700_000_000_000);
    base.player.coins = 100;
    base.player.lastActiveAt = 1_700_000_000_000;
    base.clicker.autoCoinsPerSec = 3;

    const result = applyIdleProgress(base, 1_700_000_010_000);

    expect(result.report.elapsedSeconds).toBe(10);
    expect(result.report.passiveCoinsGained).toBe(30);
    expect(result.data.player.coins).toBe(130);
  });
});
