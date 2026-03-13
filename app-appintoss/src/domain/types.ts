export type LanguageCode = "ko";

export type TabKey = "home" | "collection" | "decorate" | "upgrade" | "shop" | "settings";

export type ShopCategory = "seed" | "pot" | "background";

export type Rarity = "common" | "rare" | "epic";

export type GardenSlotPlantState = {
  speciesId: string;
  plantedAt: number;
  growSeconds: number;
  harvested: boolean;
};

export type GardenSlotState = {
  slotId: string;
  potId: string;
  planted: GardenSlotPlantState | null;
};

export type DecorItemType = "flower" | "pot";

export type DecorPlacement = {
  id: string;
  itemType: DecorItemType;
  refId: string;
  x: number;
  y: number;
};

export type DecorDisplayLayer = "back" | "mid" | "front";

export type DecorDisplaySlotState = {
  slotId: string;
  layer: DecorDisplayLayer;
  page: number;
  potId: string;
  speciesId: string | null;
};

export type DecorGoalRewardState = {
  lastClaimedPeriodKey: string | null;
  claimedTier: number;
};

export type AttendanceState = {
  cycleDay: number;
  lastClaimedPeriodKey: string | null;
  unlockClaimedDays: number[];
};

export type ClickerState = {
  tapPower: number;
  autoCoinsPerSec: number;
  growthBoostSeconds: number;
  tapUpgradeLevel: number;
  autoUpgradeLevel: number;
  boostUpgradeLevel: number;
};

export type SaveDataV1 = {
  schemaVersion: 1;
  player: { coins: number; gems: number; createdAt: number; lastActiveAt: number; language: "ko" };
  garden: { backgroundId: string; slots: GardenSlotState[] };
  decor: {
    items: DecorPlacement[];
    nextItemId: number;
    displayFlowerCounts: Record<string, number>;
    displaySlots: DecorDisplaySlotState[];
    goalReward: DecorGoalRewardState;
  };
  attendance: AttendanceState;
  inventory: { seedCounts: Record<string, number> };
  collection: {
    discoveredSpeciesIds: string[];
    ownedPotIds: string[];
    ownedBackgroundIds: string[];
    flowerCounts: Record<string, number>;
    plantNicknames: Record<string, string>;
    claimedSetRewardIds: string[];
  };
  clicker: ClickerState;
  settings: { sfxOn: boolean; bgmOn: boolean; homePotTintIndex: number; homeWindowOpen: boolean };
};

export type PlantSpeciesDef = {
  id: string;
  nameKo: string;
  rarity: "common" | "rare" | "epic";
  growSeconds: number;
  rewardCoins: number;
  stages: 4;
  seedPrice: number;
  descriptionKo: string;
  originKo: string;
  flowerLanguageKo: string;
  seasonKo: string;
  stemColorHex: string;
  bloomColorHex: string;
};

export type PotDef = {
  id: string;
  nameKo: string;
  price: number;
  colorHex: string;
  rimHex: string;
};

export type BackgroundDef = {
  id: string;
  nameKo: string;
  price: number;
  skyTopHex: string;
  skyBottomHex: string;
  groundHex: string;
};
