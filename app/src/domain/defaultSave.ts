import { BACKGROUND_DEFS } from "../content/backgrounds";
import { PLANT_SPECIES_DEFS } from "../content/plants";
import { POT_DEFS } from "../content/pots";
import {
  DECOR_DISPLAY_PAGE_COUNT,
  DECOR_DISPLAY_SLOT_LAYOUT,
  GARDEN_SLOT_COUNT,
  INITIAL_PLAYER_COINS,
  SAVE_SCHEMA_VERSION
} from "./constants";
import { DecorDisplaySlotState, GardenSlotState, SaveDataV1 } from "./types";

const STARTER_FLOWER_ID = "plant_tulip";

function createDefaultSlots(defaultPotId: string): GardenSlotState[] {
  return Array.from({ length: GARDEN_SLOT_COUNT }, (_, index) => ({
    slotId: `slot-${String(index + 1).padStart(2, "0")}`,
    potId: defaultPotId,
    planted: null
  }));
}

function createStarterSeedCounts(): Record<string, number> {
  const starter = Object.fromEntries(PLANT_SPECIES_DEFS.map((species) => [species.id, 0]));
  if (starter[STARTER_FLOWER_ID] !== undefined) {
    starter[STARTER_FLOWER_ID] = 5;
  }

  // Keep a few starter seeds for other early flowers.
  if (PLANT_SPECIES_DEFS[0] && PLANT_SPECIES_DEFS[0].id !== STARTER_FLOWER_ID) {
    starter[PLANT_SPECIES_DEFS[0].id] = 2;
  }
  if (PLANT_SPECIES_DEFS[1] && PLANT_SPECIES_DEFS[1].id !== STARTER_FLOWER_ID) {
    starter[PLANT_SPECIES_DEFS[1].id] = 2;
  }
  return starter;
}

function createDefaultFlowerCounts(): Record<string, number> {
  return Object.fromEntries(PLANT_SPECIES_DEFS.map((species) => [species.id, 0]));
}

function createDefaultDecorDisplayFlowerCounts(): Record<string, number> {
  return Object.fromEntries(PLANT_SPECIES_DEFS.map((species) => [species.id, 0]));
}

function createDefaultPlantNicknames(): Record<string, string> {
  return Object.fromEntries(PLANT_SPECIES_DEFS.map((species) => [species.id, ""]));
}

function createDefaultDecorDisplaySlots(defaultPotId: string): DecorDisplaySlotState[] {
  const slots: DecorDisplaySlotState[] = [];
  for (let pageIndex = 0; pageIndex < DECOR_DISPLAY_PAGE_COUNT; pageIndex += 1) {
    slots.push(
      ...DECOR_DISPLAY_SLOT_LAYOUT.map((slot) => ({
        slotId: slot.slotId,
        layer: slot.layer,
        page: pageIndex,
        potId: defaultPotId,
        speciesId: null
      }))
    );
  }
  return slots;
}

export function createDefaultSaveData(now = Date.now()): SaveDataV1 {
  const defaultPotId = POT_DEFS[0]?.id ?? "pot_default";
  const defaultBackgroundId =
    BACKGROUND_DEFS.find((background) => background.id === "bg_sunset")?.id ?? BACKGROUND_DEFS[0]?.id ?? "bg_default";

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    player: {
      coins: INITIAL_PLAYER_COINS,
      gems: 0,
      createdAt: now,
      lastActiveAt: now,
      language: "ko"
    },
    garden: {
      backgroundId: defaultBackgroundId,
      slots: createDefaultSlots(defaultPotId)
    },
    decor: {
      items: [],
      nextItemId: 1,
      displayFlowerCounts: createDefaultDecorDisplayFlowerCounts(),
      displaySlots: createDefaultDecorDisplaySlots(defaultPotId),
      goalReward: {
        lastClaimedPeriodKey: null,
        claimedTier: 0
      }
    },
    attendance: {
      cycleDay: 0,
      lastClaimedPeriodKey: null,
      unlockClaimedDays: []
    },
    inventory: {
      seedCounts: createStarterSeedCounts()
    },
    collection: {
      discoveredSpeciesIds: [],
      ownedPotIds: [defaultPotId],
      ownedBackgroundIds: [defaultBackgroundId],
      flowerCounts: createDefaultFlowerCounts(),
      plantNicknames: createDefaultPlantNicknames(),
      claimedSetRewardIds: []
    },
    clicker: {
      tapPower: 1,
      autoCoinsPerSec: 0,
      growthBoostSeconds: 2,
      tapUpgradeLevel: 1,
      autoUpgradeLevel: 0,
      boostUpgradeLevel: 1
    },
    settings: {
      sfxOn: false,
      bgmOn: false,
      homePotTintIndex: 0,
      homeWindowOpen: true
    }
  };
}
