import Phaser from "phaser";
import {
  getGeneratedPlantImagePathMap,
  getGeneratedPotImagePathMap,
  hasOptimizedSourceAsset,
  resolveAssetPath
} from "../content/assetPipeline";
import { BACKGROUND_BY_ID, BACKGROUND_DEFS, SHOP_BACKGROUND_DEFS } from "../content/backgrounds";
import { PLANT_BY_ID, PLANT_SPECIES_DEFS } from "../content/plants";
import { POT_BY_ID, POT_DEFS } from "../content/pots";
import {
  DECOR_DISPLAY_PAGE_COUNT,
  DECOR_DISPLAY_SLOT_LAYOUT,
  GARDEN_SLOT_COUNT,
  MAX_PLAYER_COINS,
  MAX_PLAYER_GEMS,
  MAX_TOTAL_SEEDS
} from "../domain/constants";
import { createDefaultSaveData } from "../domain/defaultSave";
import {
  DecorDisplayLayer,
  DecorDisplaySlotState,
  DecorPlacement,
  GardenSlotState,
  PlantSpeciesDef,
  SaveDataV1,
  TabKey
} from "../domain/types";
import {
  applyIdleProgress,
  getPlantStage,
  getRemainingGrowSeconds,
  isPlantHarvestable
} from "../services/idleProgressService";
import { LocalStorageSaveRepository } from "../services/saveRepository";

type ButtonOptions = {
  enabled?: boolean;
  fillColor?: number;
  strokeColor?: number;
  textColor?: string;
  textStrokeColor?: string;
  textStrokeThickness?: number;
  fontSize?: number;
  textOffsetY?: number;
  hitPadding?: number;
  triggerOnPointerDown?: boolean;
  holdRepeatMs?: number;
  holdRepeatInitialDelayMs?: number;
};

type CollectionCategory = "flower" | "plant" | "set";
type SpeciesGroupCategory = "flower" | "foliage" | "succulent";
type ShopTab = "pot" | "background" | "purchase";
type PrimaryTabKey = "collection" | "home" | "decorate" | "shop";
type DecorDisplaySlotLayout = {
  slotId: string;
  layer: DecorDisplayLayer;
  x: number;
  y: number;
  labelKo: string;
};
type PixelPlantSizeTier = "small" | "medium" | "large";
type DecorNamePlateStyle = "rect" | "round";
type DecorEmptySlotPlusStyle = "line" | "block";
type DecorThemeGoalDef = {
  id: "flower_focus" | "foliage_focus" | "succulent_focus";
  labelKo: string;
  category: SpeciesGroupCategory;
  requiredCount: number;
  bonusScore: number;
};
type DecorDisplayGoalSummary = {
  filledCount: number;
  setTargetCount: number;
  baseScore: number;
  setBonusScore: number;
  themeBonusScore: number;
  varietyBonusScore: number;
  totalScore: number;
  themeGoal: DecorThemeGoalDef;
  themeCount: number;
  isSetComplete: boolean;
  isThemeComplete: boolean;
};
type DecorScoreRewardTier = {
  titleKo: string;
  minScore: number;
  rewardCoins: number;
  rewardSeeds: number;
};
type DecorScoreRewardStatus = {
  periodKey: string;
  claimedTier: number;
  unlockedTier: number;
  canClaim: boolean;
  nextTier: DecorScoreRewardTier | null;
};
type CollectionSetRewardDef = {
  id: string;
  titleKo: string;
  speciesIds: string[];
  rewardCoins: number;
  rewardSeeds: number;
};
type AttendanceUnlockRewardDef = {
  day: number;
  titleKo: string;
  seedCount?: number;
  gemCount?: number;
  coinCount?: number;
  unlockPotId?: string;
  unlockBackgroundId?: string;
};

const TAB_ORDER: TabKey[] = ["collection", "home", "decorate", "shop"];
const TAB_LABELS: Record<TabKey, string> = {
  home: "홈",
  collection: "도감",
  decorate: "정원",
  upgrade: "출석",
  shop: "상점",
  settings: "설정"
};

const SHOP_TAB_ORDER: ShopTab[] = ["pot", "background", "purchase"];
const SHOP_TAB_LABELS: Record<ShopTab, string> = {
  pot: "화분",
  background: "배경",
  purchase: "구매"
};

const RARITY_LABELS: Record<PlantSpeciesDef["rarity"], string> = {
  common: "일반",
  rare: "희귀",
  epic: "에픽"
};

const RARITY_COLORS: Record<PlantSpeciesDef["rarity"], number> = {
  common: 0x4b9d63,
  rare: 0x4c75c8,
  epic: 0xad59ce
};
const RARITY_SORT_ORDER: Record<PlantSpeciesDef["rarity"], number> = {
  common: 0,
  rare: 1,
  epic: 2
};
const AUTO_SAVE_INTERVAL_MS = 30_000;

const COLLECTION_CATEGORY_ORDER: CollectionCategory[] = ["flower", "plant", "set"];
const COLLECTION_CATEGORY_LABELS: Record<CollectionCategory, string> = {
  flower: "꽃",
  plant: "식물",
  set: "세트"
};
const SPECIES_GROUP_BY_SPECIES_ID: Partial<Record<string, SpeciesGroupCategory>> = {
  plant_tulip: "flower",
  plant_rose: "flower",
  plant_daisy: "flower",
  plant_anemone: "flower",
  plant_calendula: "flower",
  plant_camellia: "flower",
  plant_canna_lily: "flower",
  plant_carnation: "flower",
  plant_hyacinth: "flower",
  plant_coquelicot: "flower",
  plant_freesia: "flower",
  plant_gerbera: "flower",
  plant_lily: "flower",
  plant_lily_of_the_valley: "flower",
  plant_lisianthus: "flower",
  plant_myosotis: "flower",
  plant_pansy: "flower",
  plant_peony_blossom: "flower",
  plant_rocket_larkspur: "flower",
  plant_sunflower: "flower",
  plant_delphinium: "flower",
  plant_lilac: "flower",
  plant_chrysanthemum: "flower",
  plant_mugunghwa: "flower",
  plant_monstera: "foliage",
  plant_rubber_tree: "foliage",
  plant_scindapsus: "foliage",
  plant_alocasia: "foliage",
  plant_anthurium: "foliage",
  plant_boston_fern: "foliage",
  plant_calathea_orbifolia: "foliage",
  plant_coffea: "foliage",
  plant_eucalyptus: "foliage",
  plant_giant_white_bird_of_paradise: "foliage",
  plant_ivy: "foliage",
  plant_money_tree: "foliage",
  plant_philodendron_gloriosum: "foliage",
  plant_spider_plant: "foliage",
  plant_staghorn_fern: "foliage",
  plant_strelitzia_reginae: "foliage",
  plant_syngonium_podophyllum: "foliage",
  plant_yellow_palm: "foliage",
  plant_cotyledon_orbiculata: "succulent",
  plant_echeveria: "succulent",
  plant_lithops: "succulent",
  plant_sedum_burrito: "succulent",
  plant_sedum_clavatum: "succulent",
  plant_sedum_species: "succulent",
  plant_kalanchoe_thyrsiflora: "succulent",
  plant_kalanchoe_tomentosa: "succulent",
  plant_stuckyi: "succulent",
  plant_aloe: "succulent",
  plant_aloe_mitriformis: "succulent",
  plant_roadkill_cactus: "succulent",
  plant_astrophytum: "succulent",
  plant_black_prince: "succulent",
  plant_conophytum_bilobum: "succulent",
  plant_flame: "succulent",
  plant_haworthia: "succulent",
  plant_splitrock: "succulent",
  plant_string_of_pearls: "succulent"
};
const GENERATED_PLANT_IMAGE_PATH_BY_SPECIES_ID = getGeneratedPlantImagePathMap();
const GENERATED_PLANT_SPECIES_ID_SET = new Set(Object.keys(GENERATED_PLANT_IMAGE_PATH_BY_SPECIES_ID));
const AVAILABLE_PLANT_SPECIES_DEFS: PlantSpeciesDef[] =
  GENERATED_PLANT_SPECIES_ID_SET.size > 0
    ? PLANT_SPECIES_DEFS.filter((species) => GENERATED_PLANT_SPECIES_ID_SET.has(species.id))
    : [...PLANT_SPECIES_DEFS];
const AVAILABLE_PLANT_SPECIES_ID_SET = new Set(AVAILABLE_PLANT_SPECIES_DEFS.map((species) => species.id));

const RAW_GROWABLE_SPECIES_IDS = [
  "plant_tulip",
  "plant_rose",
  "plant_daisy",
  "plant_anemone",
  "plant_calendula",
  "plant_camellia",
  "plant_canna_lily",
  "plant_carnation",
  "plant_hyacinth",
  "plant_coquelicot",
  "plant_freesia",
  "plant_gerbera",
  "plant_lily",
  "plant_lily_of_the_valley",
  "plant_lisianthus",
  "plant_myosotis",
  "plant_pansy",
  "plant_peony_blossom",
  "plant_sunflower",
  "plant_delphinium",
  "plant_lilac",
  "plant_chrysanthemum",
  "plant_mugunghwa",
  "plant_monstera",
  "plant_rubber_tree",
  "plant_scindapsus",
  "plant_alocasia",
  "plant_anthurium",
  "plant_boston_fern",
  "plant_calathea_orbifolia",
  "plant_coffea",
  "plant_eucalyptus",
  "plant_giant_white_bird_of_paradise",
  "plant_ivy",
  "plant_money_tree",
  "plant_philodendron_gloriosum",
  "plant_spider_plant",
  "plant_staghorn_fern",
  "plant_strelitzia_reginae",
  "plant_syngonium_podophyllum",
  "plant_yellow_palm",
  "plant_cotyledon_orbiculata",
  "plant_echeveria",
  "plant_lithops",
  "plant_sedum_burrito",
  "plant_sedum_clavatum",
  "plant_sedum_species",
  "plant_kalanchoe_thyrsiflora",
  "plant_kalanchoe_tomentosa",
  "plant_stuckyi",
  "plant_aloe",
  "plant_aloe_mitriformis",
  "plant_roadkill_cactus",
  "plant_astrophytum",
  "plant_black_prince",
  "plant_conophytum_bilobum",
  "plant_flame",
  "plant_haworthia",
  "plant_splitrock",
  "plant_string_of_pearls"
] as const;
const ACTIVE_GROWABLE_SPECIES_IDS = RAW_GROWABLE_SPECIES_IDS.filter((speciesId) =>
  AVAILABLE_PLANT_SPECIES_ID_SET.has(speciesId)
);

const TEST_FLOWER_ID = "plant_tulip";
const DEFAULT_DECOR_FLOWER_ID =
  PLANT_BY_ID[TEST_FLOWER_ID] && AVAILABLE_PLANT_SPECIES_ID_SET.has(TEST_FLOWER_ID)
    ? TEST_FLOWER_ID
    : AVAILABLE_PLANT_SPECIES_DEFS[0]?.id ?? "";
const CARTOON_PRIORITY_SPECIES_IDS = ["plant_tulip", "plant_rose", "plant_daisy", "plant_monstera"] as const;
const CARTOON_PRIORITY_SPECIES_ID_SET = new Set<string>(CARTOON_PRIORITY_SPECIES_IDS);
const UNKNOWN_FLOWER_TEXTURE_KEY = "ui_secret_unknown_flower";
const UNKNOWN_FLOWER_IMAGE_PATH = "assets/ui/ui_secret.png";
const POT_PREVIEW_TEXTURE_KEY_BY_ID: Partial<Record<string, string>> = {
  pot_clay: "pot_preview_basic",
  pot_white: "pot_preview_white",
  pot_yellow: "pot_preview_yellow",
  pot_green: "pot_preview_green",
  pot_silver: "pot_preview_silver",
  pot_blue: "pot_preview_blue",
  pot_pink: "pot_preview_pink",
  pot_violet: "pot_preview_violet",
  pot_cylinder: "pot_preview_cylinder",
  pot_moon_jar: "pot_preview_moon_jar",
  pot_organic_cream: "pot_preview_organic_cream",
  pot_organic_mocha: "pot_preview_organic_mocha",
  pot_organic_olive: "pot_preview_organic_olive",
  pot_organic_sand: "pot_preview_organic_sand",
  pot_modern_mocha: "pot_preview_modern_mocha",
  pot_modern_sand: "pot_preview_modern_sand",
  pot_modern_olive: "pot_preview_modern_olive",
  pot_moon_jar_cream: "pot_preview_moon_jar_cream",
  pot_moon_jar_crock: "pot_preview_moon_jar_crock",
  pot_antique_greece: "pot_preview_antique_greece"
};
const POT_PREVIEW_IMAGE_PATH_BY_TEXTURE_KEY: Record<string, string> = {
  pot_preview_basic: "assets/pots/pot_basic.png",
  pot_preview_white: "assets/pots/pot_white.png",
  pot_preview_yellow: "assets/pots/pot_yellow.png",
  pot_preview_green: "assets/pots/pot_green.png",
  pot_preview_silver: "assets/pots/pot_sliver.png",
  pot_preview_blue: "assets/pots/pot_blue.png",
  pot_preview_pink: "assets/pots/pot_pink.png",
  pot_preview_violet: "assets/pots/pot_violet.png",
  pot_preview_cylinder: "assets/pots/pot_Cylinder Pot.png",
  pot_preview_moon_jar: "assets/pots/pot_moon jar.png",
  pot_preview_organic_cream: "assets/pots/pot_Organic cream.png",
  pot_preview_organic_mocha: "assets/pots/pot_Organic mocha.png",
  pot_preview_organic_olive: "assets/pots/pot_Organic olive.png",
  pot_preview_organic_sand: "assets/pots/pot_Organic sand.png",
  pot_preview_modern_mocha: "assets/pots/pot_modern_mocha.png",
  pot_preview_modern_sand: "assets/pots/pot_modern_sand.png",
  pot_preview_modern_olive: "assets/pots/pot_modern_olive.png",
  pot_preview_moon_jar_cream: "assets/pots/pot_moon jar_cream.png",
  pot_preview_moon_jar_crock: "assets/pots/pot_moon jar_crock.png",
  pot_preview_antique_greece: "assets/pots/pot_antique_Greece.png"
};
const GENERATED_POT_IMAGE_PATH_BY_POT_ID = getGeneratedPotImagePathMap();
Object.entries(POT_PREVIEW_TEXTURE_KEY_BY_ID).forEach(([potId, textureKey]) => {
  if (!textureKey) {
    return;
  }
  const generatedPath = GENERATED_POT_IMAGE_PATH_BY_POT_ID[potId];
  if (!generatedPath) {
    return;
  }
  POT_PREVIEW_IMAGE_PATH_BY_TEXTURE_KEY[textureKey] = generatedPath;
});
const SEED_DROP_TEXTURE_KEY = "ui_seed_drop_texture";
const GEM_PACK_TEXTURE_KEY = "ui_gem_pack";
const GEM_PACK_IMAGE_PATH = "assets/ui/ui_gem_pack.png";
const ATTENDANCE_GEM_ICON_TEXTURE_KEY = "ui_attendance_gem_icon";
const ATTENDANCE_GEM_ICON_CUTOUT_TEXTURE_KEY = "ui_attendance_gem_icon_cutout";
const ATTENDANCE_GEM_ICON_IMAGE_PATH = "assets/ui/ui_jewelry.png";
const ATTENDANCE_BACKGROUND_TEXTURE_KEY = "ui_attendance_background";
const ATTENDANCE_BACKGROUND_IMAGE_PATH = "assets/ui/ui_backgrounds_basic.png";
const HOME_WINDOW_OVERLAY_TEXTURE_KEY = "ui_home_window";
const HOME_WINDOW_OVERLAY_CENTER_X = 195;
const HOME_WINDOW_OVERLAY_CENTER_Y = 218;
const HOME_WINDOW_OVERLAY_DISPLAY_WIDTH = 1040;
const HOME_WINDOW_OVERLAY_DISPLAY_HEIGHT = 508;
const HOME_WINDOW_INTERIOR_MASK_TEXTURE_KEY = "home_window_interior_mask";
const ATTENDANCE_REWARD_CARD_TEXTURE_KEY = "ui_attendance_reward_card";
const ATTENDANCE_REWARD_CARD_CUTOUT_TEXTURE_KEY = "ui_attendance_reward_card_cutout";
const ATTENDANCE_REWARD_CARD_IMAGE_PATH = "assets/ui/ui_attendance_reward_card.png.png";
const MONSTERA_COLLECTION_IMAGE_PATH_CANDIDATES = [
  "assets/plants/foliage plant/plant_Monstera delicios.png",
  "assets/plants/foliage plant/plant_Monstera deliciosa.png",
  "assets/plants/foliage plant/plant_ceriman.png"
] as const;
const resolvePreferredAssetPath = (candidates: readonly string[], fallback: string): string => {
  for (const candidate of candidates) {
    if (hasOptimizedSourceAsset(candidate)) {
      return candidate;
    }
  }
  return fallback;
};
const COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID: Partial<Record<string, string>> = {
  plant_daisy: "assets/plants/flower/plant_daisy.png",
  plant_rose: "assets/plants/flower/plant_rose.png",
  plant_tulip: "assets/plants/flower/plant_tulip.png",
  plant_anemone: "assets/plants/flower/plant_anemone.png",
  plant_calendula: "assets/plants/flower/plant_calendula.png",
  plant_camellia: "assets/plants/flower/plant_camellia.png",
  plant_canna_lily: "assets/plants/flower/plant_canna lily.png",
  plant_carnation: "assets/plants/flower/plant_carnation.png",
  plant_hyacinth: "assets/plants/flower/plant_hyacinth.png",
  plant_coquelicot: "assets/plants/flower/plant_coquelicot.png",
  plant_freesia: "assets/plants/flower/plant_freesia.png",
  plant_gerbera: "assets/plants/flower/plant_gerbera.png",
  plant_lily: "assets/plants/flower/plant_lily.png",
  plant_lily_of_the_valley: "assets/plants/flower/plant_lily of the valley.png",
  plant_lisianthus: "assets/plants/flower/plant_lisianthus.png",
  plant_myosotis: "assets/plants/flower/plant_myosotis.png",
  plant_pansy: "assets/plants/flower/plant_pansy.png",
  plant_peony_blossom: "assets/plants/flower/plant_peony blossom.png",
  plant_rocket_larkspur: "assets/plants/flower/plant_delphinium.png",
  plant_sunflower: "assets/plants/flower/plant_sunflower.png",
  plant_delphinium: "assets/plants/flower/plant_delphinium.png",
  plant_lilac: "assets/plants/flower/plant_lilac.png",
  plant_chrysanthemum: "assets/plants/flower/plant_Chrysanthemum.png",
  plant_mugunghwa: "assets/plants/flower/plant_Mugunghwa.png",
  plant_monstera: resolvePreferredAssetPath(
    MONSTERA_COLLECTION_IMAGE_PATH_CANDIDATES,
    "assets/plants/foliage plant/plant_Monstera deliciosa.png"
  ),
  plant_rubber_tree: "assets/plants/foliage plant/plant_rubber plant.png",
  plant_scindapsus: "assets/plants/foliage plant/plant_scindapsus.png",
  plant_alocasia: "assets/plants/foliage plant/plant_alocasia.png",
  plant_anthurium: "assets/plants/foliage plant/plant_anthurium.png",
  plant_boston_fern: "assets/plants/foliage plant/plant_boston fern.png",
  plant_calathea_orbifolia: "assets/plants/foliage plant/plant_calathea orbifolia.png",
  plant_coffea: "assets/plants/foliage plant/plant_coffea.png",
  plant_eucalyptus: "assets/plants/foliage plant/plant_eucalyptus.png",
  plant_giant_white_bird_of_paradise: "assets/plants/foliage plant/plant_giant white bird of paradise.png",
  plant_ivy: "assets/plants/foliage plant/plant_ivy.png",
  plant_money_tree: "assets/plants/foliage plant/plant_money tree.png",
  plant_philodendron_gloriosum: "assets/plants/foliage plant/plant_philodendron gloriosum.png",
  plant_spider_plant: "assets/plants/foliage plant/plant_spider plant.png",
  plant_staghorn_fern: "assets/plants/foliage plant/plant_staghorn fern.png",
  plant_strelitzia_reginae: "assets/plants/foliage plant/plant_strelitzia reginae.png",
  plant_syngonium_podophyllum: "assets/plants/foliage plant/plant_syngonium podophyllum.png",
  plant_yellow_palm: "assets/plants/foliage plant/plant_yellow palm.png",
  plant_cotyledon_orbiculata: "assets/plants/fleshy plant/plant_Cotyledon orbiculata.png",
  plant_echeveria: "assets/plants/fleshy plant/plant_Echeveria.png",
  plant_lithops: "assets/plants/fleshy plant/plant_Lithops.png",
  plant_sedum_burrito: "assets/plants/fleshy plant/plant_Sedum burrito.png",
  plant_sedum_clavatum: "assets/plants/fleshy plant/plant_Sedum clavatum.png",
  plant_sedum_species: "assets/plants/fleshy plant/plant_Sedum species.png",
  plant_kalanchoe_thyrsiflora: "assets/plants/fleshy plant/plant_kalanchoe thyrsiflora.png",
  plant_kalanchoe_tomentosa: "assets/plants/fleshy plant/plant_kalanchoe tomentosa.png",
  plant_stuckyi: "assets/plants/fleshy plant/plant_stookie.png",
  plant_aloe: "assets/plants/fleshy plant/plant_aloe.png",
  plant_aloe_mitriformis: "assets/plants/fleshy plant/plant_Aloe mitriformis.png",
  plant_roadkill_cactus: "assets/plants/fleshy plant/plant_roadkill cactus.png",
  plant_astrophytum: "assets/plants/fleshy plant/plant_Astrophytum.png",
  plant_black_prince: "assets/plants/fleshy plant/plant_Black Prince.png",
  plant_conophytum_bilobum: "assets/plants/fleshy plant/plant_Conophytum bilobum.png",
  plant_flame: "assets/plants/fleshy plant/plant_Flame.png",
  plant_haworthia: "assets/plants/fleshy plant/plant_Haworthia.png",
  plant_splitrock: "assets/plants/fleshy plant/plant_Splitrock.png",
  plant_string_of_pearls: "assets/plants/fleshy plant/plant_String of Pearls.png"
};
const resolveAvailableCollectionFlowerImagePath = (speciesId: string): string | null => {
  const collectionPath = COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID[speciesId];
  if (collectionPath && hasOptimizedSourceAsset(collectionPath)) {
    return collectionPath;
  }
  const generatedPath = GENERATED_PLANT_IMAGE_PATH_BY_SPECIES_ID[speciesId];
  if (generatedPath) {
    return generatedPath;
  }
  return null;
};
const AVAILABLE_COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID: Partial<Record<string, string>> = {};
for (const species of AVAILABLE_PLANT_SPECIES_DEFS) {
  const resolvedPath = resolveAvailableCollectionFlowerImagePath(species.id);
  if (!resolvedPath) {
    continue;
  }
  AVAILABLE_COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID[species.id] = resolvedPath;
}
const AVAILABLE_DECOR_FLOWER_IMAGE_PATH_BY_SPECIES_ID: Partial<Record<string, string>> = {
  ...AVAILABLE_COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID
};
const COIN_ICON_TEXTURE_KEY = "ui_header_coin_icon";
const SEED_ICON_TEXTURE_KEY = "ui_header_seed_icon";
const GEM_ICON_TEXTURE_KEY = "ui_header_gem_icon";
const BACKGROUND_IMAGE_CONFIG: Partial<Record<string, { textureKey: string; assetPath: string }>> = {
  bg_meadow: {
    textureKey: "background_bg_meadow",
    assetPath: "assets/ui/ui_backgrounds_basic.png"
  },
  bg_sunset: {
    textureKey: "background_bg_sunset",
    assetPath: "assets/backgrounds/bg_jeju.png"
  },
  bg_damyang: {
    textureKey: "background_bg_damyang",
    assetPath: "assets/backgrounds/bg_damyang.png"
  },
  bg_gangwondo: {
    textureKey: "background_bg_gangwondo",
    assetPath: "assets/backgrounds/bg_gangwondo.png"
  },
  bg_japan: {
    textureKey: "background_bg_japan",
    assetPath: "assets/backgrounds/bg_japan.png"
  },
  bg_china: {
    textureKey: "background_bg_china",
    assetPath: "assets/backgrounds/bg_china.png"
  },
  bg_france: {
    textureKey: "background_bg_france",
    assetPath: "assets/backgrounds/bg_france.png"
  },
  bg_italy: {
    textureKey: "background_bg_italy",
    assetPath: "assets/backgrounds/bg_Italy.png"
  },
  bg_netherlands: {
    textureKey: "background_bg_netherlands",
    assetPath: "assets/backgrounds/bg_netherlands.png"
  },
  bg_portugal: {
    textureKey: "background_bg_portugal",
    assetPath: "assets/backgrounds/bg_portugal.png"
  },
  bg_india: {
    textureKey: "background_bg_india",
    assetPath: "assets/backgrounds/bg_republic of India.png"
  },
  bg_russia: {
    textureKey: "background_bg_russia",
    assetPath: "assets/backgrounds/bg_russia.png"
  },
  bg_spain: {
    textureKey: "background_bg_spain",
    assetPath: "assets/backgrounds/bg_spain.png"
  },
  bg_switzerland: {
    textureKey: "background_bg_switzerland",
    assetPath: "assets/backgrounds/bg_switzerland.png"
  },
  bg_uk: {
    textureKey: "background_bg_uk",
    assetPath: "assets/backgrounds/bg_united kingdom.png"
  },
  bg_korean_house: {
    textureKey: "background_bg_korean_house",
    assetPath: "assets/backgrounds/bg_korean style house.png"
  },
  bg_window2: {
    textureKey: "background_bg_window2",
    assetPath: "assets/ui/ui_backgrounds_basic.png"
  }
};
const HOME_WINDOW_FRAME_BACKGROUND_ID = "bg_meadow";
const HOME_WINDOW_FRAME_TRANSPARENT_TEXTURE_KEY = "home_window_frame_transparent";
const HOME_DEFAULT_VIEW_BACKGROUND_ID = "bg_sunset";
const HOME_WINDOW_INNER_CENTER_X = 195;
const HOME_WINDOW_INNER_CENTER_Y = 247;
const HOME_WINDOW_INNER_WIDTH = 262;
const HOME_WINDOW_INNER_HEIGHT = 368;
const HOME_WINDOW_OPENING_SOURCE = {
  x: 614,
  y: 118,
  width: 279,
  height: 427
};
const HOME_WINDOW_GAP_FILL_COLOR = 0x6f3a14;
const DECOR_GARDEN_BASE_TEXTURE_KEY = "background_decor_basic_base";
const DECOR_GARDEN_BASE_ASSET_PATH = "assets/ui/ui_backgrounds_basic.png";
const DECOR_MIN_X = 30;
const DECOR_MAX_X = 360;
const DECOR_MIN_Y = 155;
const DECOR_MAX_Y = 485;

const MAIN_WIDTH = 390;
const MAIN_HEIGHT = 676;
const COLLECTION_PAGE_SIZE = 4;
const COLLECTION_SET_PAGE_SIZE = 4;
const SHOP_PAGE_SIZE = 4;
const SHOP_CATEGORY_Y = 146;
const SHOP_ITEM_BASE_Y = 214;
const SHOP_FOOTER_Y = 646;
const TAB_TITLE_X = 24;
const TAB_TITLE_Y = 22;
const TAB_TITLE_FONT_SIZE = "26px";
const TAB_SUBTITLE_Y = 56;
const DECOR_STAGE_CENTER_X = 195;
const DECOR_STAGE_CENTER_Y = 320;
const DECOR_STAGE_WIDTH = 330;
const DECOR_STAGE_HEIGHT = 330;
const DECOR_GRID_COLS = 5;
const DECOR_GRID_ROWS = 3;
const DECOR_GRID_ROW_GAP = 16;
const DECOR_DISPLAY_SLOT_LAYOUTS: DecorDisplaySlotLayout[] = [
  { slotId: "display-top-1", layer: "back", x: 130, y: 206, labelKo: "A1" },
  { slotId: "display-top-2", layer: "back", x: 260, y: 206, labelKo: "A2" },
  { slotId: "display-mid-1", layer: "mid", x: 80, y: 356, labelKo: "B1" },
  { slotId: "display-mid-2", layer: "mid", x: 195, y: 356, labelKo: "B2" },
  { slotId: "display-mid-3", layer: "mid", x: 310, y: 356, labelKo: "B3" },
  { slotId: "display-bottom-1", layer: "front", x: 130, y: 506, labelKo: "C1" },
  { slotId: "display-bottom-2", layer: "front", x: 260, y: 506, labelKo: "C2" }
];
const DECOR_DISPLAY_LAYER_ORDER: DecorDisplayLayer[] = ["back", "mid", "front"];
const DECOR_DISPLAY_SLOT_LAYOUT_BY_ID = Object.fromEntries(
  DECOR_DISPLAY_SLOT_LAYOUTS.map((slot) => [slot.slotId, slot])
) as Record<string, DecorDisplaySlotLayout>;
const CLICKER_CENTER_X = 195;
const CLICKER_CENTER_Y = 422;
const CLICKER_PROGRESS_Y = 641;
const CLICKER_STATUS_Y = 574;
const CLICKER_ACTION_BUTTON_Y = 606;
const CLICKER_FLOATING_Y = 590;
const CLICKER_FLOATING_TARGET_Y = 556;
const HOME_PIXEL_SAMPLE_TOGGLE_X = 70;
const HOME_PIXEL_SAMPLE_TOGGLE_Y = 96;
const DECOR_PIXEL_SAMPLE_TOGGLE_X = 70;
const DECOR_PIXEL_SAMPLE_TOGGLE_Y = 96;
const COLLECTION_PIXEL_SAMPLE_TOGGLE_X = 70;
const COLLECTION_PIXEL_SAMPLE_TOGGLE_Y = 96;
const CLICKER_MAX_UPGRADE_LEVEL = 5;
const RANDOM_SEED_SHOP_PRICE = 30;
const LOADING_MIN_DISPLAY_MS = 1500;
const LOADING_MAX_PARALLEL_DOWNLOADS = 8;
const LOADING_RANDOM_MESSAGES = [
  "오늘도 만나서 반가워요",
  "기분 좋은 하루 보내요",
  "오늘도 당신을 응원해요",
  "오늘 하루도 화이팅해요",
  "반짝이는 하루 되길바래요"
] as const;
const LOADING_POT_TEXTURE_KEY = "ui_loading_pot";
const LOADING_POT_IMAGE_PATH = "assets/ui/ui_loading_pot.png";
const LOADING_POT_CUTOUT_TEXTURE_KEY = "ui_loading_pot_cutout";
const LOADING_SPROUT_TEXTURE_KEY = "ui_loading_sprout";
const LOADING_SPROUT_IMAGE_PATH = "assets/ui/ui_loading_sprout.png";
const LOADING_SPROUT_CUTOUT_TEXTURE_KEY = "ui_loading_sprout_cutout";
const ATTENDANCE_AD_CONFIRM_MESSAGE = "보상을 받으려면 광고를 시청해야 합니다.\n시청하시겠습니까?";
const MAX_PLANT_NICKNAME_LENGTH = 5;
const SEED_DROP_START_OFFSET_Y = 100;
const SEED_DROP_DISPLAY_WIDTH = 52;
const SEED_DROP_DISPLAY_HEIGHT = 36;
const DECOR_PIXEL_ROSE_TEXTURE_KEY = "decor_pixel_sample_rose";
const DECOR_PIXEL_ROSE_IMAGE_PATH =
  AVAILABLE_DECOR_FLOWER_IMAGE_PATH_BY_SPECIES_ID.plant_rose ?? "assets/plants/flower/plant_rose.png";
const DECOR_PIXEL_ROSE_CUTOUT_TEXTURE_KEY = "decor_pixel_sample_rose_cutout";
const DECOR_PIXEL_MONSTERA_TEXTURE_KEY = "decor_pixel_sample_monstera";
const DECOR_PIXEL_MONSTERA_IMAGE_PATH = resolvePreferredAssetPath(
  [
    AVAILABLE_DECOR_FLOWER_IMAGE_PATH_BY_SPECIES_ID.plant_monstera,
    "assets/plants/foliage plant/plant_Monstera deliciosa.png"
  ].filter((path): path is string => Boolean(path)),
  "assets/plants/foliage plant/plant_Monstera deliciosa.png"
);
const DECOR_PIXEL_MONSTERA_CUTOUT_TEXTURE_KEY = "decor_pixel_sample_monstera_cutout";
const DECOR_NAME_PLATE_STYLE: DecorNamePlateStyle = "round";
const DECOR_EMPTY_SLOT_PLUS_STYLE: DecorEmptySlotPlusStyle = "block";
const DECOR_PIXEL_POT_PALETTE = {
  rim: 0x7b5236,
  rimLight: 0x966444,
  rimTopLight: 0xaa7250,
  body: 0xb78358,
  bodyLight: 0xc9956d,
  bodyShade: 0x9c6e49,
  bodyBottom: 0x855b3d,
  soil: 0x4d2f1b,
  soilLight: 0x664026,
  shadow: 0x000000
} as const;
const DECOR_PIXEL_TIER_PRESET: Record<
  PixelPlantSizeTier,
  {
    plantScale: number;
    potScale: number;
    plantOffsetY: number;
    potOffsetY: number;
    namePlateY: number;
  }
> = {
  small: {
    plantScale: 1.44,
    potScale: 1.46,
    plantOffsetY: 0,
    potOffsetY: 3,
    namePlateY: 56
  },
  medium: {
    plantScale: 1.58,
    potScale: 1.48,
    plantOffsetY: -2,
    potOffsetY: 2,
    namePlateY: 58
  },
  large: {
    plantScale: 1.7,
    potScale: 1.5,
    plantOffsetY: -5,
    potOffsetY: 1,
    namePlateY: 60
  }
};
const DECOR_PIXEL_SPECIES_TIER: Partial<Record<string, PixelPlantSizeTier>> = {
  plant_tulip: "small",
  plant_rose: "medium",
  plant_calendula: "medium",
  plant_monstera: "large",
  plant_coffea: "medium",
  plant_stuckyi: "medium",
  plant_sedum_burrito: "medium"
};

const ATTENDANCE_RESET_HOUR_KST = 6;
const KST_UTC_OFFSET_HOURS = 9;
const ATTENDANCE_DAY_SHIFT_HOURS = KST_UTC_OFFSET_HOURS - ATTENDANCE_RESET_HOUR_KST;

type AttendanceRewardDef = {
  seedCount: number;
  gemCount: number;
};

const ATTENDANCE_REWARDS: AttendanceRewardDef[] = [
  { seedCount: 2, gemCount: 0 },
  { seedCount: 2, gemCount: 0 },
  { seedCount: 0, gemCount: 1 },
  { seedCount: 2, gemCount: 0 },
  { seedCount: 2, gemCount: 0 },
  { seedCount: 2, gemCount: 0 },
  { seedCount: 0, gemCount: 3 }
];
const DECOR_DISPLAY_SET_TARGET_COUNT = DECOR_DISPLAY_SLOT_LAYOUT.length;
const DECOR_DISPLAY_SET_BONUS_SCORE = 240;
const DECOR_DISPLAY_VARIETY_BONUS_SCORE = 70;
const DECOR_DISPLAY_BASE_SCORE_BY_RARITY: Record<PlantSpeciesDef["rarity"], number> = {
  common: 90,
  rare: 140,
  epic: 220
};
const DECOR_THEME_GOALS: DecorThemeGoalDef[] = [
  {
    id: "flower_focus",
    labelKo: "꽃 정원",
    category: "flower",
    requiredCount: 4,
    bonusScore: 110
  },
  {
    id: "foliage_focus",
    labelKo: "관엽 쉼터",
    category: "foliage",
    requiredCount: 4,
    bonusScore: 110
  },
  {
    id: "succulent_focus",
    labelKo: "다육 컬렉션",
    category: "succulent",
    requiredCount: 4,
    bonusScore: 130
  }
];
const DECOR_SCORE_REWARD_TIERS: DecorScoreRewardTier[] = [
  {
    titleKo: "브론즈 보상",
    minScore: 700,
    rewardCoins: 120,
    rewardSeeds: 1
  },
  {
    titleKo: "실버 보상",
    minScore: 950,
    rewardCoins: 180,
    rewardSeeds: 2
  },
  {
    titleKo: "골드 보상",
    minScore: 1200,
    rewardCoins: 260,
    rewardSeeds: 3
  }
];
const COLLECTION_SET_REWARD_TITLES = [
  "새싹 컬렉션",
  "봄빛 컬렉션",
  "숲빛 컬렉션",
  "햇살 컬렉션",
  "온실 컬렉션",
  "마스터 컬렉션"
] as const;
const COLLECTION_SET_REWARD_DEFS: CollectionSetRewardDef[] = Array.from({ length: COLLECTION_SET_REWARD_TITLES.length }, (_, index) => {
  const speciesIds = ACTIVE_GROWABLE_SPECIES_IDS.slice(index * 6, index * 6 + 6).filter((speciesId) =>
    AVAILABLE_PLANT_SPECIES_ID_SET.has(speciesId)
  );
  return {
    id: `set-${String(index + 1).padStart(2, "0")}`,
    titleKo: COLLECTION_SET_REWARD_TITLES[index] ?? `컬렉션 ${index + 1}`,
    speciesIds,
    rewardCoins: 120 + index * 40,
    rewardSeeds: 1 + Math.floor(index / 2)
  };
}).filter((setDef) => setDef.speciesIds.length > 0);
const COLLECTION_SET_REWARD_ID_SET = new Set(COLLECTION_SET_REWARD_DEFS.map((setDef) => setDef.id));
const EARLY_UNLOCK_REWARDS: AttendanceUnlockRewardDef[] = [
  {
    day: 1,
    titleKo: "웰컴 씨앗 팩",
    seedCount: 2
  },
  {
    day: 2,
    titleKo: "화이트 화분 해금",
    unlockPotId: "pot_white"
  },
  {
    day: 3,
    titleKo: "담양 배경 해금",
    unlockBackgroundId: "bg_damyang"
  },
  {
    day: 4,
    titleKo: "성장 지원 보상",
    seedCount: 2,
    gemCount: 1
  },
  {
    day: 5,
    titleKo: "옐로우 화분 해금",
    unlockPotId: "pot_yellow"
  },
  {
    day: 6,
    titleKo: "성장지원팩",
    seedCount: 3
  },
  {
    day: 7,
    titleKo: "7일 완주 보상",
    gemCount: 4,
    coinCount: 180
  }
];
const EARLY_UNLOCK_REWARD_BY_DAY = Object.fromEntries(
  EARLY_UNLOCK_REWARDS.map((reward) => [reward.day, reward])
) as Partial<Record<number, AttendanceUnlockRewardDef>>;

function hexToNumber(hex: string, fallback = 0xffffff): number {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const parsed = Number.parseInt(normalized, 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function shiftColor(color: number, delta: number): number {
  const rgb = Phaser.Display.Color.IntegerToColor(color);
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  return Phaser.Display.Color.GetColor(clamp(rgb.red + delta), clamp(rgb.green + delta), clamp(rgb.blue + delta));
}

function clampCoins(value: number): number {
  return Math.min(MAX_PLAYER_COINS, Math.max(0, Math.floor(value)));
}

function clampGems(value: number): number {
  return Math.min(MAX_PLAYER_GEMS, Math.max(0, Math.floor(value)));
}

function getTotalSeedCount(seedCounts: Record<string, number>): number {
  return Object.values(seedCounts).reduce((sum, count) => sum + Math.max(0, Math.floor(count)), 0);
}

function getSeedCapacity(seedCounts: Record<string, number>): number {
  return Math.max(0, MAX_TOTAL_SEEDS - getTotalSeedCount(seedCounts));
}

function formatSeconds(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}:${String(remainSeconds).padStart(2, "0")}`;
}

function formatDateTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString("ko-KR", {
    hour12: false
  });
}

function getAttendancePeriodKeyKst(nowMs: number): string {
  const shifted = new Date(nowMs + ATTENDANCE_DAY_SHIFT_HOURS * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAttendanceRewardForDay(day: number): AttendanceRewardDef {
  const index = Math.max(0, Math.min(ATTENDANCE_REWARDS.length - 1, Math.floor(day) - 1));
  return ATTENDANCE_REWARDS[index] ?? ATTENDANCE_REWARDS[0];
}

function getAttendanceUnlockRewardForDay(day: number): AttendanceUnlockRewardDef | null {
  const normalizedDay = Math.max(1, Math.min(7, Math.floor(day)));
  return EARLY_UNLOCK_REWARD_BY_DAY[normalizedDay] ?? null;
}

function getTapUpgradeCost(level: number): number {
  return 30 + Math.max(0, level - 1) * 28;
}

function getAutoUpgradeCost(level: number): number {
  return 70 + level * 52;
}

function getBoostUpgradeCost(level: number): number {
  return 55 + Math.max(0, level - 1) * 42;
}

function getCollectionFlowerTextureKey(speciesId: string): string {
  return `collection_flower_${speciesId}`;
}

function getCollectionFlowerCutoutTextureKey(speciesId: string): string {
  return `${getCollectionFlowerTextureKey(speciesId)}_cutout`;
}

function getDecorFlowerTextureKey(speciesId: string): string {
  return `decor_flower_${speciesId}`;
}

function getDecorFlowerCutoutTextureKey(speciesId: string): string {
  return `${getDecorFlowerTextureKey(speciesId)}_cutout`;
}

function getSpeciesGroupForSpecies(speciesId: string): SpeciesGroupCategory {
  return SPECIES_GROUP_BY_SPECIES_ID[speciesId] ?? "flower";
}

function getActiveGrowableSpecies(): PlantSpeciesDef[] {
  const activeSpecies = ACTIVE_GROWABLE_SPECIES_IDS.map((speciesId) => PLANT_BY_ID[speciesId]).filter(
    (species): species is PlantSpeciesDef => Boolean(species)
  );
  if (activeSpecies.length > 0) {
    return activeSpecies;
  }
  return AVAILABLE_PLANT_SPECIES_DEFS;
}

function getPotPreviewTextureKey(potId: string): string | null {
  return POT_PREVIEW_TEXTURE_KEY_BY_ID[potId] ?? null;
}

function getPotPreviewCutoutTextureKey(potId: string): string {
  return `pot_preview_cutout_${potId}`;
}

function truncateLabel(text: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }
  const chars = Array.from(text);
  if (chars.length <= maxLength) {
    return text;
  }
  return `${chars.slice(0, Math.max(0, maxLength - 1)).join("")}…`;
}

function isPrimaryTab(tab: TabKey): tab is PrimaryTabKey {
  return tab === "collection" || tab === "home" || tab === "decorate" || tab === "shop";
}

export class GardenGameScene extends Phaser.Scene {
  private readonly saveRepository = new LocalStorageSaveRepository();

  private saveData: SaveDataV1 = createDefaultSaveData();
  private homeWindowOpeningSource = { ...HOME_WINDOW_OPENING_SOURCE };
  private activeTab: TabKey = "home";
  private selectedCollectionSpeciesId: string | null = null;
  private selectedDecorFlowerId = DEFAULT_DECOR_FLOWER_ID;
  private selectedDecorPotId = POT_DEFS[0]?.id ?? "";
  private decorEditFlowerCategoryFilter: SpeciesGroupCategory = "flower";
  private selectedDecorItemId: string | null = null;
  private selectedDecorSlotId: string | null = null;
  private decorPageIndex = 0;
  private decoratePaletteType: "flower" | "pot" = "flower";
  private pendingDecorPlacementType: "flower" | "pot" | null = null;
  private shopTab: ShopTab = "pot";
  private selectedCustomizePotId = POT_DEFS[0]?.id ?? "";
  private selectedCustomizeBackgroundId = BACKGROUND_DEFS[0]?.id ?? "";
  private isHomeCustomizeGridOpen = false;
  private isHomeAttendancePanelOpen = false;
  private attendancePreviewDay = 1;
  private isDecorEditMode = false;
  private isDecorClearMode = false;
  private isDecorPlacementPanelOpen = true;
  private collectionCategory: CollectionCategory = "flower";
  private collectionPage = 0;
  private shopPage = 0;
  private resetArmedUntil = 0;

  private headerLayer!: Phaser.GameObjects.Container;
  private mainLayer!: Phaser.GameObjects.Container;
  private homeTapEffectLayer!: Phaser.GameObjects.Container;
  private navLayer!: Phaser.GameObjects.Container;
  private toastLayer!: Phaser.GameObjects.Container;
  private modalLayer!: Phaser.GameObjects.Container;

  private harvestNicknameModal: Phaser.GameObjects.Container | null = null;
  private attendanceAdConfirmModal: Phaser.GameObjects.Container | null = null;
  private decorGoalModal: Phaser.GameObjects.Container | null = null;
  private decorSlotEditModal: Phaser.GameObjects.Container | null = null;
  private isOpeningDecorSlotEditModal = false;
  private harvestNicknameInputElement: HTMLInputElement | null = null;
  private harvestNicknameInputDisposer: (() => void) | null = null;
  private homePotPulseTarget: Phaser.GameObjects.Container | null = null;
  private homeTapEffectCooldownUntil = 0;
  private nextHomeIdleWaterDropAt = 0;
  private deferredVisualAssetsQueued = false;
  private homeWindowClippedTextureSignature: string | null = null;
  private isHomePixelSampleMode = false;
  private isDecorPixelSampleMode = false;
  private wasHomePlantHarvestable = false;

  private coinsText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private gemText!: Phaser.GameObjects.Text;
  private coinHeaderLabelText!: Phaser.GameObjects.Text;
  private seedHeaderLabelText!: Phaser.GameObjects.Text;
  private gemHeaderLabelText!: Phaser.GameObjects.Text;
  private coinHeaderIcon: Phaser.GameObjects.Image | null = null;
  private seedHeaderIcon: Phaser.GameObjects.Image | null = null;
  private gemHeaderIcon: Phaser.GameObjects.Image | null = null;
  private headerCoinCenterX = 71;
  private headerSeedCenterX = 195;
  private headerGemCenterX = 319;
  private headerResourceCardWidth = 96;

  private toastTimer?: Phaser.Time.TimerEvent;
  private autoSaveTimer?: Phaser.Time.TimerEvent;

  private commitSaveSnapshot(touchLastActiveAt = false): void {
    if (touchLastActiveAt) {
      this.saveData.player.lastActiveAt = Date.now();
    }
    this.saveRepository.saveDebounced(this.saveData);
    this.saveRepository.flush();
  }

  private readonly flushSave = () => {
    this.commitSaveSnapshot(true);
  };

  private readonly onVisibilityChange = () => {
    if (document.hidden) {
      this.commitSaveSnapshot(true);
      return;
    }

    const applied = applyIdleProgress(this.saveData, Date.now());
    this.saveData = applied.data;
    this.commitSaveSnapshot(false);
    this.renderAll();

    if (applied.report.wasBackwardTime) {
      this.showToast("기기 시간이 과거로 이동해 오프라인 진행이 적용되지 않았습니다.");
      return;
    }

    if (applied.report.passiveCoinsGained > 0) {
      this.showToast(`오프라인 자동코인 +${applied.report.passiveCoinsGained}`);
      return;
    }

  };

  constructor() {
    super("GardenGameScene");
  }

  preload(): void {
    this.load.maxParallelDownloads = LOADING_MAX_PARALLEL_DOWNLOADS;
    // Preload a minimal critical set so mobile first paint does not show long fallback blocks.
    const queueCriticalImage = (textureKey: string, assetPath: string): void => {
      if (this.textures.exists(textureKey)) {
        return;
      }
      this.load.image(textureKey, resolveAssetPath(assetPath));
    };
    queueCriticalImage(ATTENDANCE_BACKGROUND_TEXTURE_KEY, ATTENDANCE_BACKGROUND_IMAGE_PATH);

    const frameConfig = BACKGROUND_IMAGE_CONFIG[HOME_WINDOW_FRAME_BACKGROUND_ID];
    if (frameConfig) {
      queueCriticalImage(frameConfig.textureKey, frameConfig.assetPath);
    }

    const defaultViewConfig = BACKGROUND_IMAGE_CONFIG[HOME_DEFAULT_VIEW_BACKGROUND_ID];
    if (defaultViewConfig) {
      queueCriticalImage(defaultViewConfig.textureKey, defaultViewConfig.assetPath);
    }

    // Remaining heavy assets are queued after create() in queueDeferredVisualAssets().
  }

  private queueDeferredVisualAssets(): void {
    if (this.deferredVisualAssetsQueued) {
      return;
    }
    this.deferredVisualAssetsQueued = true;

    let queuedCount = 0;
    const queueDeferredImage = (textureKey: string, assetPath: string): void => {
      if (this.textures.exists(textureKey)) {
        return;
      }
      this.load.image(textureKey, resolveAssetPath(assetPath));
      queuedCount += 1;
    };

    queueDeferredImage(UNKNOWN_FLOWER_TEXTURE_KEY, UNKNOWN_FLOWER_IMAGE_PATH);
    Object.entries(POT_PREVIEW_IMAGE_PATH_BY_TEXTURE_KEY).forEach(([textureKey, imagePath]) => {
      queueDeferredImage(textureKey, imagePath);
    });
    queueDeferredImage(GEM_PACK_TEXTURE_KEY, GEM_PACK_IMAGE_PATH);
    queueDeferredImage(ATTENDANCE_GEM_ICON_TEXTURE_KEY, ATTENDANCE_GEM_ICON_IMAGE_PATH);
    queueDeferredImage(ATTENDANCE_BACKGROUND_TEXTURE_KEY, ATTENDANCE_BACKGROUND_IMAGE_PATH);
    queueDeferredImage(ATTENDANCE_REWARD_CARD_TEXTURE_KEY, ATTENDANCE_REWARD_CARD_IMAGE_PATH);
    queueDeferredImage(DECOR_PIXEL_ROSE_TEXTURE_KEY, DECOR_PIXEL_ROSE_IMAGE_PATH);
    queueDeferredImage(DECOR_PIXEL_MONSTERA_TEXTURE_KEY, DECOR_PIXEL_MONSTERA_IMAGE_PATH);

    Object.entries(AVAILABLE_COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID).forEach(([speciesId, imagePath]) => {
      if (!imagePath) {
        return;
      }
      queueDeferredImage(getCollectionFlowerTextureKey(speciesId), imagePath);
    });
    Object.entries(AVAILABLE_DECOR_FLOWER_IMAGE_PATH_BY_SPECIES_ID).forEach(([speciesId, imagePath]) => {
      if (!imagePath) {
        return;
      }
      queueDeferredImage(getDecorFlowerTextureKey(speciesId), imagePath);
    });
    Object.values(BACKGROUND_IMAGE_CONFIG)
      .filter((config): config is { textureKey: string; assetPath: string } => Boolean(config))
      .forEach((config) => {
        queueDeferredImage(config.textureKey, config.assetPath);
      });
    queueDeferredImage(DECOR_GARDEN_BASE_TEXTURE_KEY, DECOR_GARDEN_BASE_ASSET_PATH);

    if (queuedCount <= 0) {
      this.createSeedDropTexture();
      this.createAttendanceRewardCardTexture();
      this.createAttendanceGemIconTexture();
      this.createPotPreviewCutoutTextures();
      this.createCollectionFlowerCutoutTextures();
      this.createDecorFlowerCutoutTextures();
      this.createDecorPixelSampleCutoutTextures();
      return;
    }

    let deferredLoadErrorCount = 0;
    const onDeferredLoadError = (file: Phaser.Loader.File): void => {
      deferredLoadErrorCount += 1;
      console.warn(`[loader] deferred asset load failed: ${file.key} (${file.src ?? "unknown src"})`);
    };

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onDeferredLoadError);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onDeferredLoadError);
      this.createSeedDropTexture();
      this.createAttendanceRewardCardTexture();
      this.createAttendanceGemIconTexture();
      this.createPotPreviewCutoutTextures();
      this.createCollectionFlowerCutoutTextures();
      this.createDecorFlowerCutoutTextures();
      this.createDecorPixelSampleCutoutTextures();
      if (deferredLoadErrorCount > 0) {
        this.showToast("일부 이미지 로드가 지연되었습니다.");
      }
      this.renderMain();
    });
    this.load.start();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0xf6f2df);
    this.createSeedDropTexture();
    this.createAttendanceRewardCardTexture();
    this.createAttendanceGemIconTexture();
    this.createHeaderIconTextures();
    this.createCollectionFlowerCutoutTextures();
    this.createDecorFlowerCutoutTextures();
    this.createPotPreviewCutoutTextures();
    this.createDecorPixelSampleCutoutTextures();
    this.buildShell();

    const loaded = this.saveRepository.load();
    const applied = applyIdleProgress(loaded, Date.now());
    this.saveData = applied.data;
    this.sanitizeRuntimeData(this.saveData);

    this.renderAll();
    this.queueDeferredVisualAssets();
    this.saveRepository.saveDebounced(this.saveData);

    if (applied.report.wasBackwardTime) {
      this.showToast("기기 시간이 과거로 이동해 오프라인 진행을 차단했습니다.");
    } else if (applied.report.passiveCoinsGained > 0) {
      this.showToast(`오프라인 자동코인 +${applied.report.passiveCoinsGained}`);
    }

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - this.saveData.player.lastActiveAt) / 1000);
        if (elapsedSeconds > 0) {
          const passiveCoins = elapsedSeconds * this.saveData.clicker.autoCoinsPerSec;
          if (passiveCoins > 0) {
            this.saveData.player.coins = clampCoins(this.saveData.player.coins + passiveCoins);
          }
          this.saveData.player.lastActiveAt += elapsedSeconds * 1000;
          this.saveRepository.saveDebounced(this.saveData);
        }

        this.renderHeader();
        if (this.activeTab === "home") {
          this.renderMain();
          this.maybePlayHomeIdleWaterDrop(now);
        } else {
          this.nextHomeIdleWaterDropAt = 0;
        }

        if (this.activeTab === "settings" && this.resetArmedUntil > 0 && now > this.resetArmedUntil) {
          this.resetArmedUntil = 0;
          this.renderMain();
        }
      }
    });
    this.autoSaveTimer = this.time.addEvent({
      delay: AUTO_SAVE_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.commitSaveSnapshot(false);
      }
    });

    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("beforeunload", this.flushSave);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.handleShutdown();
    });

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.handleShutdown();
    });
  }

  private getIsUnifiedPixelStyleMode(): boolean {
    return false;
  }

  private setUnifiedPixelSampleMode(enabled: boolean): void {
    const nextValue = Boolean(enabled);
    if (this.isHomePixelSampleMode === nextValue && this.isDecorPixelSampleMode === nextValue) {
      return;
    }

    this.isHomePixelSampleMode = nextValue;
    this.isDecorPixelSampleMode = nextValue;
    this.wasHomePlantHarvestable = false;
    this.homeWindowClippedTextureSignature = null;
    if (this.textures.exists("home_window_clipped_content")) {
      this.textures.remove("home_window_clipped_content");
    }
    this.showToast(nextValue ? "픽셀 스타일 ON" : "픽셀 스타일 OFF");
    this.renderMain();
  }

  private toggleHomePixelSampleMode(): void {
    this.setUnifiedPixelSampleMode(!this.getIsUnifiedPixelStyleMode());
  }

  private toggleDecorPixelSampleMode(): void {
    this.setUnifiedPixelSampleMode(!this.getIsUnifiedPixelStyleMode());
  }

  private toggleCollectionPixelSampleMode(): void {
    this.setUnifiedPixelSampleMode(!this.getIsUnifiedPixelStyleMode());
  }

  private handleShutdown(): void {
    this.closeHarvestNicknameModal();
    this.closeAttendanceAdConfirmModal();
    this.closeDecorGoalModal();
    this.closeDecorSlotEditModal();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("beforeunload", this.flushSave);
    if (this.autoSaveTimer) {
      this.autoSaveTimer.remove(false);
      this.autoSaveTimer = undefined;
    }
    this.commitSaveSnapshot(true);
  }

  private createSeedDropTexture(): void {
    const createFallbackSeedTexture = (textureKey: string): void => {
      if (this.textures.exists(textureKey)) {
        return;
      }
      const seed = this.add.graphics();
      seed.fillStyle(0xf3cc84, 1);
      seed.beginPath();
      seed.moveTo(12, 2);
      seed.lineTo(20, 12);
      seed.lineTo(12, 22);
      seed.lineTo(4, 12);
      seed.closePath();
      seed.fillPath();
      seed.lineStyle(2, 0xa96f2f, 1);
      seed.strokePath();
      seed.fillStyle(0xe2b46d, 0.8);
      seed.fillTriangle(12, 4, 16, 12, 8, 12);
      seed.generateTexture(textureKey, 24, 24);
      seed.destroy();
    };

    // Never remove a live texture key at runtime.
    // Removing while a rendered image still references it can cause glTexture=null crashes.
    if (this.textures.exists(SEED_DROP_TEXTURE_KEY)) {
      return;
    }

    createFallbackSeedTexture(SEED_DROP_TEXTURE_KEY);
  }

  private createAttendanceRewardCardTexture(): void {
    if (!this.textures.exists(ATTENDANCE_REWARD_CARD_TEXTURE_KEY)) {
      return;
    }
    this.createCutoutTextureFromLoadedImage(
      ATTENDANCE_REWARD_CARD_TEXTURE_KEY,
      ATTENDANCE_REWARD_CARD_CUTOUT_TEXTURE_KEY,
      0.08
    );
  }

  private createAttendanceGemIconTexture(): void {
    if (!this.textures.exists(ATTENDANCE_GEM_ICON_TEXTURE_KEY)) {
      return;
    }
    this.createCutoutTextureFromLoadedImage(
      ATTENDANCE_GEM_ICON_TEXTURE_KEY,
      ATTENDANCE_GEM_ICON_CUTOUT_TEXTURE_KEY,
      0.05
    );
  }

  private getAttendanceGemIconTextureKey(): string {
    if (this.textures.exists(GEM_ICON_TEXTURE_KEY)) {
      return GEM_ICON_TEXTURE_KEY;
    }
    if (this.textures.exists(ATTENDANCE_GEM_ICON_CUTOUT_TEXTURE_KEY)) {
      return ATTENDANCE_GEM_ICON_CUTOUT_TEXTURE_KEY;
    }
    if (this.textures.exists(ATTENDANCE_GEM_ICON_TEXTURE_KEY)) {
      return ATTENDANCE_GEM_ICON_TEXTURE_KEY;
    }
    return SEED_ICON_TEXTURE_KEY;
  }

  private createCutoutTextureFromLoadedImage(
    sourceTextureKey: string,
    outputTextureKey: string,
    paddingRatio = 0.12
  ): boolean {
    if (!this.textures.exists(sourceTextureKey)) {
      return false;
    }

    const sourceImage = this.textures.get(sourceTextureKey).getSourceImage() as CanvasImageSource & {
      width: number;
      height: number;
    };
    const sourceWidth = Math.max(1, Math.floor(sourceImage.width));
    const sourceHeight = Math.max(1, Math.floor(sourceImage.height));
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) {
      return false;
    }

    sourceCtx.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
    const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
    const pixels = imageData.data;

    let borderR = 0;
    let borderG = 0;
    let borderB = 0;
    let borderCount = 0;
    const step = Math.max(1, Math.floor(Math.min(sourceWidth, sourceHeight) / 120));
    for (let x = 0; x < sourceWidth; x += step) {
      const top = x * 4;
      const bottom = ((sourceHeight - 1) * sourceWidth + x) * 4;
      borderR += pixels[top];
      borderG += pixels[top + 1];
      borderB += pixels[top + 2];
      borderR += pixels[bottom];
      borderG += pixels[bottom + 1];
      borderB += pixels[bottom + 2];
      borderCount += 2;
    }
    for (let y = 0; y < sourceHeight; y += step) {
      const left = y * sourceWidth * 4;
      const right = (y * sourceWidth + (sourceWidth - 1)) * 4;
      borderR += pixels[left];
      borderG += pixels[left + 1];
      borderB += pixels[left + 2];
      borderR += pixels[right];
      borderG += pixels[right + 1];
      borderB += pixels[right + 2];
      borderCount += 2;
    }
    if (borderCount <= 0) {
      return false;
    }

    const bgR = borderR / borderCount;
    const bgG = borderG / borderCount;
    const bgB = borderB / borderCount;
    const thresholdLow = 12;
    const thresholdHigh = 38;

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const index = (y * sourceWidth + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];
        const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        const alphaFactor = Phaser.Math.Clamp((diff - thresholdLow) / (thresholdHigh - thresholdLow), 0, 1);
        const nextAlpha = Math.floor(a * alphaFactor);
        pixels[index + 3] = nextAlpha;
      }
    }

    sourceCtx.putImageData(imageData, 0, 0);

    // Keep existing runtime texture to avoid invalidating frames already rendered on screen.
    if (this.textures.exists(outputTextureKey)) {
      return true;
    }

    const alphaThreshold = 8;
    const pixelCount = sourceWidth * sourceHeight;
    const mask = new Uint8Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      mask[index] = pixels[index * 4 + 3] > alphaThreshold ? 1 : 0;
    }

    type ComponentBounds = { minX: number; minY: number; maxX: number; maxY: number; count: number };
    const components: ComponentBounds[] = [];
    const visited = new Uint8Array(pixelCount);
    const stack: number[] = [];

    for (let startIndex = 0; startIndex < pixelCount; startIndex += 1) {
      if (mask[startIndex] === 0 || visited[startIndex] === 1) {
        continue;
      }

      let minX = sourceWidth;
      let minY = sourceHeight;
      let maxX = -1;
      let maxY = -1;
      let count = 0;

      visited[startIndex] = 1;
      stack.push(startIndex);

      while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined) {
          break;
        }

        const x = current % sourceWidth;
        const y = Math.floor(current / sourceWidth);
        count += 1;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;

        const left = x > 0 ? current - 1 : -1;
        const right = x < sourceWidth - 1 ? current + 1 : -1;
        const up = y > 0 ? current - sourceWidth : -1;
        const down = y < sourceHeight - 1 ? current + sourceWidth : -1;

        if (left >= 0 && mask[left] === 1 && visited[left] === 0) {
          visited[left] = 1;
          stack.push(left);
        }
        if (right >= 0 && mask[right] === 1 && visited[right] === 0) {
          visited[right] = 1;
          stack.push(right);
        }
        if (up >= 0 && mask[up] === 1 && visited[up] === 0) {
          visited[up] = 1;
          stack.push(up);
        }
        if (down >= 0 && mask[down] === 1 && visited[down] === 0) {
          visited[down] = 1;
          stack.push(down);
        }
      }

      if (count > 0) {
        components.push({ minX, minY, maxX, maxY, count });
      }
    }

    if (components.length === 0) {
      const emptyTexture = this.textures.createCanvas(outputTextureKey, sourceWidth, sourceHeight);
      if (emptyTexture) {
        emptyTexture.refresh();
      }
      return true;
    }

    const largestComponent = components.reduce((max, component) =>
      component.count > max.count ? component : max
    );
    const minimumCountToKeep = Math.max(64, Math.floor(largestComponent.count * 0.03));
    const keptComponents = components.filter((component) => component.count >= minimumCountToKeep);
    const boundsSource = keptComponents.length > 0 ? keptComponents : [largestComponent];

    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = -1;
    let maxY = -1;
    boundsSource.forEach((component) => {
      if (component.minX < minX) minX = component.minX;
      if (component.minY < minY) minY = component.minY;
      if (component.maxX > maxX) maxX = component.maxX;
      if (component.maxY > maxY) maxY = component.maxY;
    });

    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    const padding = Math.max(6, Math.round(Math.max(contentWidth, contentHeight) * paddingRatio));
    const outWidth = contentWidth + padding * 2;
    const outHeight = contentHeight + padding * 2;
    const outTexture = this.textures.createCanvas(outputTextureKey, outWidth, outHeight);
    if (!outTexture) {
      return false;
    }
    const outCtx = outTexture.getContext();
    outCtx.clearRect(0, 0, outWidth, outHeight);
    outCtx.drawImage(
      sourceCanvas,
      minX,
      minY,
      contentWidth,
      contentHeight,
      padding,
      padding,
      contentWidth,
      contentHeight
    );
    outTexture.refresh();
    return true;
  }

  private createCollectionFlowerCutoutTextures(): void {
    Object.keys(AVAILABLE_COLLECTION_FLOWER_IMAGE_PATH_BY_SPECIES_ID).forEach((speciesId) => {
      const sourceKey = getCollectionFlowerTextureKey(speciesId);
      const cutoutKey = getCollectionFlowerCutoutTextureKey(speciesId);
      this.createCutoutTextureFromLoadedImage(sourceKey, cutoutKey, 0.07);
    });
  }

  private createDecorFlowerCutoutTextures(): void {
    Object.keys(AVAILABLE_DECOR_FLOWER_IMAGE_PATH_BY_SPECIES_ID).forEach((speciesId) => {
      const sourceKey = getDecorFlowerTextureKey(speciesId);
      const cutoutKey = getDecorFlowerCutoutTextureKey(speciesId);
      this.createCutoutTextureFromLoadedImage(sourceKey, cutoutKey, 0.07);
    });
  }

  private createDecorPixelSampleCutoutTextures(): void {
    this.createCutoutTextureFromLoadedImage(DECOR_PIXEL_ROSE_TEXTURE_KEY, DECOR_PIXEL_ROSE_CUTOUT_TEXTURE_KEY, 0.06);
    this.createCutoutTextureFromLoadedImage(
      DECOR_PIXEL_MONSTERA_TEXTURE_KEY,
      DECOR_PIXEL_MONSTERA_CUTOUT_TEXTURE_KEY,
      0.06
    );
  }

  private createPotPreviewCutoutTextures(): void {
    POT_DEFS.forEach((pot) => {
      const sourceKey = getPotPreviewTextureKey(pot.id);
      if (!sourceKey) {
        return;
      }
      const cutoutKey = getPotPreviewCutoutTextureKey(pot.id);
      this.createCutoutTextureFromLoadedImage(sourceKey, cutoutKey, 0.1);
    });
  }

  private createHomeWindowFrameTransparentTexture(): void {
    if (this.textures.exists(HOME_WINDOW_FRAME_TRANSPARENT_TEXTURE_KEY)) {
      this.textures.remove(HOME_WINDOW_FRAME_TRANSPARENT_TEXTURE_KEY);
    }
    if (this.textures.exists(HOME_WINDOW_INTERIOR_MASK_TEXTURE_KEY)) {
      this.textures.remove(HOME_WINDOW_INTERIOR_MASK_TEXTURE_KEY);
    }

    const sourceTextureKey = this.textures.exists(HOME_WINDOW_OVERLAY_TEXTURE_KEY)
      ? HOME_WINDOW_OVERLAY_TEXTURE_KEY
      : BACKGROUND_IMAGE_CONFIG[HOME_WINDOW_FRAME_BACKGROUND_ID]?.textureKey;
    if (!sourceTextureKey || !this.textures.exists(sourceTextureKey)) {
      return;
    }

    const sourceImage = this.textures.get(sourceTextureKey).getSourceImage() as CanvasImageSource & {
      width: number;
      height: number;
    };
    const sourceWidth = Math.max(1, Math.floor(sourceImage.width));
    const sourceHeight = Math.max(1, Math.floor(sourceImage.height));
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) {
      return;
    }

    sourceCtx.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
    const imageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
    const pixels = imageData.data;
    this.homeWindowOpeningSource = { ...HOME_WINDOW_OPENING_SOURCE };
    let hasTransparentHole = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] <= 8) {
        hasTransparentHole = true;
        break;
      }
    }

    if (!hasTransparentHole) {
      const holeThreshold = 26;
      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        if (r <= holeThreshold && g <= holeThreshold && b <= holeThreshold) {
          pixels[index + 3] = 0;
        }
      }
      sourceCtx.putImageData(imageData, 0, 0);
      const openingSource = this.getHomeWindowOpeningSource();
      sourceCtx.clearRect(
        openingSource.x,
        openingSource.y,
        openingSource.width,
        openingSource.height
      );
    }

    this.textures.addCanvas(HOME_WINDOW_FRAME_TRANSPARENT_TEXTURE_KEY, sourceCanvas);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = sourceWidth;
    maskCanvas.height = sourceHeight;
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      const postImageData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
      const sourcePixels = postImageData.data;
      const maskImageData = maskCtx.createImageData(sourceWidth, sourceHeight);
      const maskPixels = maskImageData.data;
      const totalPixels = sourceWidth * sourceHeight;
      const alphaThreshold = 8;
      const minInteriorComponentPixels = 120;
      const visited = new Uint8Array(totalPixels);
      const interiorComponents: number[][] = [];
      const rowStride = sourceWidth;

      const isTransparent = (pixelIndex: number): boolean => sourcePixels[pixelIndex * 4 + 3] <= alphaThreshold;

      for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
        if (visited[pixelIndex] === 1 || !isTransparent(pixelIndex)) {
          continue;
        }

        const stack: number[] = [pixelIndex];
        visited[pixelIndex] = 1;
        let touchesBorder = false;
        const componentPixels: number[] = [];

        while (stack.length > 0) {
          const current = stack.pop();
          if (current === undefined) {
            break;
          }
          componentPixels.push(current);

          const x = current % sourceWidth;
          const y = Math.floor(current / sourceWidth);
          if (x === 0 || y === 0 || x === sourceWidth - 1 || y === sourceHeight - 1) {
            touchesBorder = true;
          }

          const neighbors = [
            x > 0 ? current - 1 : -1,
            x < sourceWidth - 1 ? current + 1 : -1,
            y > 0 ? current - rowStride : -1,
            y < sourceHeight - 1 ? current + rowStride : -1
          ];

          for (const neighbor of neighbors) {
            if (neighbor < 0 || visited[neighbor] === 1 || !isTransparent(neighbor)) {
              continue;
            }
            visited[neighbor] = 1;
            stack.push(neighbor);
          }
        }

        if (!touchesBorder && componentPixels.length >= minInteriorComponentPixels) {
          interiorComponents.push(componentPixels);
        }
      }

      let unionMinX = sourceWidth;
      let unionMinY = sourceHeight;
      let unionMaxX = -1;
      let unionMaxY = -1;

      if (interiorComponents.length > 0) {
        for (const componentPixels of interiorComponents) {
          for (const pixelIndex of componentPixels) {
            const x = pixelIndex % sourceWidth;
            const y = Math.floor(pixelIndex / sourceWidth);
            if (x < unionMinX) unionMinX = x;
            if (y < unionMinY) unionMinY = y;
            if (x > unionMaxX) unionMaxX = x;
            if (y > unionMaxY) unionMaxY = y;
            const rgbaOffset = pixelIndex * 4;
            maskPixels[rgbaOffset] = 255;
            maskPixels[rgbaOffset + 1] = 255;
            maskPixels[rgbaOffset + 2] = 255;
            maskPixels[rgbaOffset + 3] = 255;
          }
        }
        this.homeWindowOpeningSource = {
          x: unionMinX,
          y: unionMinY,
          width: unionMaxX - unionMinX + 1,
          height: unionMaxY - unionMinY + 1
        };
      } else {
        const openingSource = this.getHomeWindowOpeningSource();
        const maskMinX = Math.max(0, Math.floor(openingSource.x));
        const maskMinY = Math.max(0, Math.floor(openingSource.y));
        const maskMaxX = Math.min(sourceWidth - 1, Math.ceil(openingSource.x + openingSource.width - 1));
        const maskMaxY = Math.min(sourceHeight - 1, Math.ceil(openingSource.y + openingSource.height - 1));
        for (let index = 0; index < sourcePixels.length; index += 4) {
          const pixelIndex = index / 4;
          const x = pixelIndex % sourceWidth;
          const y = Math.floor(pixelIndex / sourceWidth);
          const alpha = sourcePixels[index + 3];
          const inOpeningBounds = x >= maskMinX && x <= maskMaxX && y >= maskMinY && y <= maskMaxY;
          const isInterior = inOpeningBounds && alpha <= alphaThreshold;
          maskPixels[index] = 255;
          maskPixels[index + 1] = 255;
          maskPixels[index + 2] = 255;
          maskPixels[index + 3] = isInterior ? 255 : 0;
        }
      }
      maskCtx.putImageData(maskImageData, 0, 0);
      this.textures.addCanvas(HOME_WINDOW_INTERIOR_MASK_TEXTURE_KEY, maskCanvas);
    }
  }

  private getHomeWindowOpeningSource(): { x: number; y: number; width: number; height: number } {
    const source = this.homeWindowOpeningSource;
    if (source.width <= 0 || source.height <= 0) {
      return HOME_WINDOW_OPENING_SOURCE;
    }
    return source;
  }

  private detectHomeWindowOpeningSource(
    pixels: Uint8ClampedArray,
    sourceWidth: number,
    sourceHeight: number
  ): { x: number; y: number; width: number; height: number } | null {
    const roiMinX = Math.floor(sourceWidth * 0.18);
    const roiMaxX = Math.ceil(sourceWidth * 0.82);
    const roiMinY = Math.floor(sourceHeight * 0.05);
    const roiMaxY = Math.ceil(sourceHeight * 0.72);
    const roiArea = Math.max(1, (roiMaxX - roiMinX) * (roiMaxY - roiMinY));

    let transparentMinX = sourceWidth;
    let transparentMinY = sourceHeight;
    let transparentMaxX = -1;
    let transparentMaxY = -1;
    let transparentCount = 0;

    for (let y = roiMinY; y < roiMaxY; y += 1) {
      for (let x = roiMinX; x < roiMaxX; x += 1) {
        const index = (y * sourceWidth + x) * 4;
        const alpha = pixels[index + 3];
        if (alpha <= 8) {
          transparentCount += 1;
          if (x < transparentMinX) transparentMinX = x;
          if (y < transparentMinY) transparentMinY = y;
          if (x > transparentMaxX) transparentMaxX = x;
          if (y > transparentMaxY) transparentMaxY = y;
        }
      }
    }

    if (transparentCount >= roiArea * 0.08 && transparentMaxX >= transparentMinX && transparentMaxY >= transparentMinY) {
      return {
        x: transparentMinX,
        y: transparentMinY,
        width: transparentMaxX - transparentMinX + 1,
        height: transparentMaxY - transparentMinY + 1
      };
    }

    const centerX = Math.floor(sourceWidth * 0.5);
    const centerY = Math.floor(sourceHeight * 0.34);
    let seedIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    const darkSeedThreshold = 42;

    for (let y = roiMinY; y < roiMaxY; y += 1) {
      for (let x = roiMinX; x < roiMaxX; x += 1) {
        const index = (y * sourceWidth + x) * 4;
        const alpha = pixels[index + 3];
        if (alpha < 24) {
          continue;
        }
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        if (r > darkSeedThreshold || g > darkSeedThreshold || b > darkSeedThreshold) {
          continue;
        }
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          seedIndex = y * sourceWidth + x;
        }
      }
    }

    if (seedIndex < 0) {
      return null;
    }

    const totalPixels = sourceWidth * sourceHeight;
    const visited = new Uint8Array(totalPixels);
    const stack: number[] = [seedIndex];
    visited[seedIndex] = 1;
    const darkFloodThreshold = 52;

    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = -1;
    let maxY = -1;
    let count = 0;

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) {
        break;
      }
      const x = current % sourceWidth;
      const y = Math.floor(current / sourceWidth);

      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const neighbors = [
        x > roiMinX ? current - 1 : -1,
        x < roiMaxX - 1 ? current + 1 : -1,
        y > roiMinY ? current - sourceWidth : -1,
        y < roiMaxY - 1 ? current + sourceWidth : -1
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] === 1) {
          continue;
        }
        const pixelIndex = neighbor * 4;
        const alpha = pixels[pixelIndex + 3];
        if (alpha < 24) {
          continue;
        }
        const r = pixels[pixelIndex];
        const g = pixels[pixelIndex + 1];
        const b = pixels[pixelIndex + 2];
        if (r > darkFloodThreshold || g > darkFloodThreshold || b > darkFloodThreshold) {
          continue;
        }
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    if (count <= 0 || maxX < minX || maxY < minY) {
      return null;
    }

    const detectedWidth = maxX - minX + 1;
    const detectedHeight = maxY - minY + 1;
    const detectedArea = detectedWidth * detectedHeight;
    if (
      detectedArea < sourceWidth * sourceHeight * 0.05 ||
      detectedWidth < sourceWidth * 0.28 ||
      detectedHeight < sourceHeight * 0.2
    ) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: detectedWidth,
      height: detectedHeight
    };
  }

  private getHomeWindowRectFromFrameTexture(
    frameTextureKey: string
  ): { centerX: number; centerY: number; width: number; height: number } | null {
    if (!this.textures.exists(frameTextureKey)) {
      return null;
    }
    const frameSource = this.textures.get(frameTextureKey).getSourceImage() as { width?: number; height?: number };
    const frameSourceWidth = Math.max(1, Math.floor(frameSource?.width ?? 1024));
    const frameSourceHeight = Math.max(1, Math.floor(frameSource?.height ?? 1024));
    const frameScaleX = MAIN_WIDTH / frameSourceWidth;
    const frameScaleY = MAIN_HEIGHT / frameSourceHeight;
    const frameLeft = 195 - MAIN_WIDTH / 2;
    const frameTop = MAIN_HEIGHT / 2 - MAIN_HEIGHT / 2;
    const openingSource = this.getHomeWindowOpeningSource();
    const windowWidth = Math.max(1, openingSource.width * frameScaleX);
    const windowHeight = Math.max(1, openingSource.height * frameScaleY);
    const windowCenterX = frameLeft + (openingSource.x + openingSource.width / 2) * frameScaleX;
    const windowCenterY = frameTop + (openingSource.y + openingSource.height / 2) * frameScaleY;
    return {
      centerX: windowCenterX,
      centerY: windowCenterY,
      width: windowWidth,
      height: windowHeight
    };
  }

  private getHomeWindowRectFromOverlayTexture(): { centerX: number; centerY: number; width: number; height: number } | null {
    if (!this.textures.exists(HOME_WINDOW_OVERLAY_TEXTURE_KEY)) {
      return null;
    }
    const overlaySource = this.textures.get(HOME_WINDOW_OVERLAY_TEXTURE_KEY).getSourceImage() as {
      width?: number;
      height?: number;
    };
    const overlaySourceWidth = Math.max(1, Math.floor(overlaySource?.width ?? 1024));
    const overlaySourceHeight = Math.max(1, Math.floor(overlaySource?.height ?? 1024));
    const openingSource = this.getHomeWindowOpeningSource();
    const scaleX = HOME_WINDOW_OVERLAY_DISPLAY_WIDTH / overlaySourceWidth;
    const scaleY = HOME_WINDOW_OVERLAY_DISPLAY_HEIGHT / overlaySourceHeight;
    const overlayLeft = HOME_WINDOW_OVERLAY_CENTER_X - HOME_WINDOW_OVERLAY_DISPLAY_WIDTH / 2;
    const overlayTop = HOME_WINDOW_OVERLAY_CENTER_Y - HOME_WINDOW_OVERLAY_DISPLAY_HEIGHT / 2;
    return {
      centerX: overlayLeft + (openingSource.x + openingSource.width / 2) * scaleX,
      centerY: overlayTop + (openingSource.y + openingSource.height / 2) * scaleY,
      width: Math.max(1, openingSource.width * scaleX),
      height: Math.max(1, openingSource.height * scaleY)
    };
  }

  private createHeaderIconTextures(): void {
    if (this.textures.exists(COIN_ICON_TEXTURE_KEY)) {
      this.textures.remove(COIN_ICON_TEXTURE_KEY);
    }
    {
      const coin = this.add.graphics();
      const cx = 24;
      const cy = 24;
      const radius = 17;

      coin.fillStyle(0xbf4b0d, 1);
      coin.fillCircle(cx, cy + 2, radius + 1);
      coin.lineStyle(1.5, 0x9b3607, 0.95);
      coin.strokeCircle(cx, cy + 2, radius + 1);

      coin.fillStyle(0xf8ec51, 1);
      coin.fillCircle(cx, cy, radius);
      coin.fillStyle(0xf0be16, 1);
      coin.fillCircle(cx, cy + 1, radius - 3);
      coin.fillStyle(0xfff56f, 0.52);
      coin.fillEllipse(cx, cy - 7, 23, 8);
      coin.fillStyle(0xffd845, 0.34);
      coin.fillEllipse(cx, cy + 5, 26, 9);

      coin.lineStyle(2, 0xfff07c, 0.95);
      coin.strokeCircle(cx, cy, radius - 0.8);
      coin.lineStyle(1.5, 0xe5ad10, 0.85);
      coin.strokeCircle(cx, cy + 1, radius - 4.4);

      coin.lineStyle(4.8, 0xba7a09, 0.5);
      coin.beginPath();
      coin.arc(cx + 0.7, cy + 0.6, 6.1, 0.38, 5.9, false);
      coin.strokePath();
      coin.lineStyle(2.9, 0xba7a09, 0.5);
      coin.lineBetween(cx + 2.8, cy + 0.9, cx + 7.4, cy + 0.9);
      coin.lineBetween(cx + 7.4, cy + 0.9, cx + 7.4, cy + 5.3);

      coin.lineStyle(4.8, 0xffe247, 1);
      coin.beginPath();
      coin.arc(cx - 0.4, cy - 0.6, 6.1, 0.38, 5.9, false);
      coin.strokePath();
      coin.lineStyle(2.9, 0xfff39d, 0.95);
      coin.lineBetween(cx + 1.8, cy - 0.2, cx + 6.4, cy - 0.2);
      coin.lineBetween(cx + 6.4, cy - 0.2, cx + 6.4, cy + 4.2);

      coin.lineStyle(2.1, 0xfffbd6, 0.84);
      coin.beginPath();
      coin.arc(cx - 5.5, cy - 8.8, 7.1, 3.72, 5.56, false);
      coin.strokePath();
      coin.fillStyle(0xfffde9, 0.76);
      coin.fillCircle(cx - 11.2, cy - 7.1, 1.7);

      coin.generateTexture(COIN_ICON_TEXTURE_KEY, 48, 48);
      coin.destroy();
    }

    if (this.textures.exists(SEED_ICON_TEXTURE_KEY)) {
      this.textures.remove(SEED_ICON_TEXTURE_KEY);
    }
    {
      const seed = this.add.graphics();
      seed.fillStyle(0xf3cc84, 1);
      seed.beginPath();
      seed.moveTo(24, 4);
      seed.lineTo(40, 24);
      seed.lineTo(24, 44);
      seed.lineTo(8, 24);
      seed.closePath();
      seed.fillPath();
      seed.lineStyle(3, 0xa96f2f, 1);
      seed.strokePath();
      seed.fillStyle(0xe2b46d, 0.82);
      seed.fillTriangle(24, 8, 32, 24, 16, 24);
      seed.generateTexture(SEED_ICON_TEXTURE_KEY, 48, 48);
      seed.destroy();
    }

    if (this.textures.exists(GEM_ICON_TEXTURE_KEY)) {
      this.textures.remove(GEM_ICON_TEXTURE_KEY);
    }
    {
      const gem = this.add.graphics();
      gem.fillStyle(0xf062bf, 1);
      gem.beginPath();
      gem.moveTo(24, 4);
      gem.lineTo(40, 24);
      gem.lineTo(24, 44);
      gem.lineTo(8, 24);
      gem.closePath();
      gem.fillPath();
      gem.lineStyle(3, 0xae3d84, 1);
      gem.strokePath();
      gem.fillStyle(0xff9bd8, 0.84);
      gem.fillTriangle(24, 8, 32, 24, 16, 24);
      gem.generateTexture(GEM_ICON_TEXTURE_KEY, 48, 48);
      gem.destroy();
    }
  }

  private buildShell(): void {
    this.add.rectangle(195, 42, 390, 84, 0x2f4d39, 1);

    this.headerLayer = this.add.container(0, 0);
    this.mainLayer = this.add.container(0, 84);
    this.homeTapEffectLayer = this.add.container(0, 84);
    this.navLayer = this.add.container(0, 760);
    this.toastLayer = this.add.container(0, 0);
    this.modalLayer = this.add.container(0, 0);
    this.modalLayer.setDepth(40);
    this.toastLayer.setDepth(50);

    const cardWidth = this.headerResourceCardWidth;
    const cardHeight = 36;
    const cardY = 42;
    const cardGap = 8;
    const resourceLeftInset = 18;
    this.headerCoinCenterX = resourceLeftInset + cardWidth / 2;
    this.headerSeedCenterX = this.headerCoinCenterX + cardWidth + cardGap;
    this.headerGemCenterX = this.headerSeedCenterX + cardWidth + cardGap;
    const drawHeaderCard = (centerX: number): void => {
      const card = this.add.graphics();
      const left = centerX - cardWidth / 2;
      const top = cardY - cardHeight / 2;
      card.fillStyle(0xf7efdd, 1);
      card.lineStyle(2, 0xc8b89b, 0.98);
      card.fillRoundedRect(left, top, cardWidth, cardHeight, 8);
      card.strokeRoundedRect(left, top, cardWidth, cardHeight, 8);
      card.fillStyle(0xffffff, 0.2);
      card.fillRoundedRect(left + 4, top + 3, cardWidth - 8, 5, 4);
      this.headerLayer.add(card);
    };
    drawHeaderCard(this.headerCoinCenterX);
    drawHeaderCard(this.headerSeedCenterX);
    drawHeaderCard(this.headerGemCenterX);

    const headerFontFamily = '"Noto Sans KR", "Apple SD Gothic Neo", "Pretendard", sans-serif';
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: headerFontFamily,
      fontSize: "11px",
      color: "#4f4b42",
      fontStyle: "700"
    };
    const valueStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: headerFontFamily,
      fontSize: "12px",
      color: "#3f3f38",
      fontStyle: "800"
    };

    const valueY = 42;
    const coinX = this.headerCoinCenterX;
    const seedX = this.headerSeedCenterX;
    const gemX = this.headerGemCenterX;
    this.coinHeaderLabelText = this.add.text(coinX, valueY, "골드", labelStyle).setOrigin(0, 0.5);
    this.seedHeaderLabelText = this.add.text(seedX, valueY, "씨앗", labelStyle).setOrigin(0, 0.5);
    this.gemHeaderLabelText = this.add.text(gemX, valueY, "보석", labelStyle).setOrigin(0, 0.5);
    this.headerLayer.add(this.coinHeaderLabelText);
    this.headerLayer.add(this.seedHeaderLabelText);
    this.headerLayer.add(this.gemHeaderLabelText);

    const createResourceValueWithIcon = (
      centerX: number,
      preferredTextureKeys: readonly string[]
    ): { text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image | null } => {
      const valueText = this.add.text(centerX, valueY, "0", valueStyle).setOrigin(0.5, 0.5);
      const textureKey = preferredTextureKeys.find((key) => this.textures.exists(key));
      let icon: Phaser.GameObjects.Image | null = null;
      if (textureKey) {
        icon = this.add.image(centerX, valueY, textureKey);
        icon.setDisplaySize(13, 13);
        this.headerLayer.add(icon);
      }
      this.headerLayer.add(valueText);
      return { text: valueText, icon };
    };

    const coinValueDisplay = createResourceValueWithIcon(coinX, [COIN_ICON_TEXTURE_KEY]);
    this.coinsText = coinValueDisplay.text;
    this.coinHeaderIcon = coinValueDisplay.icon;
    const seedValueDisplay = createResourceValueWithIcon(seedX, [SEED_DROP_TEXTURE_KEY, SEED_ICON_TEXTURE_KEY]);
    this.seedText = seedValueDisplay.text;
    this.seedHeaderIcon = seedValueDisplay.icon;
    const gemValueDisplay = createResourceValueWithIcon(gemX, [GEM_ICON_TEXTURE_KEY]);
    this.gemText = gemValueDisplay.text;
    this.gemHeaderIcon = gemValueDisplay.icon;
    this.layoutHeaderResourceDisplays();

    const settingX = this.headerGemCenterX + cardWidth / 2 + 24;
    const settingY = 42;
    const settingBackground = this.add.graphics();
    settingBackground.fillStyle(0xf7efdd, 1);
    settingBackground.lineStyle(2, 0xc8b89b, 0.98);
    settingBackground.fillRoundedRect(settingX - 17, settingY - cardHeight / 2, 34, cardHeight, 8);
    settingBackground.strokeRoundedRect(settingX - 17, settingY - cardHeight / 2, 34, cardHeight, 8);
    settingBackground.fillStyle(0xffffff, 0.22);
    settingBackground.fillRoundedRect(settingX - 13, settingY - 12, 26, 5, 4);
    this.headerLayer.add(settingBackground);

    const settingGear = this.add.graphics();
    const toothCount = 8;
    const outerRadius = 10;
    const innerRadius = 7.1;
    const gearPoints: Phaser.Geom.Point[] = [];
    for (let index = 0; index < toothCount * 2; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * index) / toothCount;
      const pointRadius = index % 2 === 0 ? outerRadius : innerRadius;
      gearPoints.push(new Phaser.Geom.Point(settingX + Math.cos(angle) * pointRadius, settingY + Math.sin(angle) * pointRadius));
    }
    settingGear.fillStyle(0x6d757c, 1);
    settingGear.fillPoints(gearPoints, true);
    settingGear.fillStyle(0xeef2f3, 0.98);
    settingGear.fillCircle(settingX, settingY, 4.1);
    settingGear.fillStyle(0xa5acb1, 0.84);
    settingGear.fillCircle(settingX, settingY, 1.6);
    this.headerLayer.add(settingGear);

    const settingHitArea = this.add.rectangle(settingX, settingY, 32, 32, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    settingHitArea.on("pointerup", () => {
      if (this.activeTab !== "settings") {
        this.closeDecorGoalModal();
        this.closeDecorSlotEditModal();
        this.activeTab = "settings";
        this.selectedCollectionSpeciesId = null;
        this.isHomeCustomizeGridOpen = false;
        this.isHomeAttendancePanelOpen = false;
        this.renderAll();
      }
    });
    settingHitArea.on("pointerout", () => {
      settingBackground.setAlpha(1);
      settingGear.setAlpha(1);
    });
    settingHitArea.on("pointerover", () => {
      settingBackground.setAlpha(0.88);
      settingGear.setAlpha(0.82);
    });
    this.headerLayer.add(settingHitArea);
  }

  private renderAll(): void {
    if (this.activeTab !== "home" && this.homeTapEffectLayer?.active) {
      this.homeTapEffectLayer.removeAll(true);
      this.wasHomePlantHarvestable = false;
    }
    this.renderHeader();
    this.renderMain();
  }

  private renderHeader(): void {
    const seedTotal = Math.min(MAX_TOTAL_SEEDS, getTotalSeedCount(this.saveData.inventory.seedCounts));
    const gemTotal = clampGems(this.saveData.player.gems);
    const coinTotal = clampCoins(this.saveData.player.coins);

    this.coinsText.setText(coinTotal.toLocaleString("ko-KR"));
    this.seedText.setText(seedTotal.toLocaleString("ko-KR"));
    this.gemText.setText(gemTotal.toLocaleString("ko-KR"));
    this.layoutHeaderResourceDisplays();
  }

  private layoutHeaderResourceDisplays(): void {
    this.layoutHeaderResourceDisplay(this.coinsText, this.coinHeaderIcon, this.headerCoinCenterX, this.coinHeaderLabelText);
    this.layoutHeaderResourceDisplay(this.seedText, this.seedHeaderIcon, this.headerSeedCenterX, this.seedHeaderLabelText);
    this.layoutHeaderResourceDisplay(this.gemText, this.gemHeaderIcon, this.headerGemCenterX, this.gemHeaderLabelText);
  }

  private layoutHeaderResourceDisplay(
    valueText: Phaser.GameObjects.Text,
    icon: Phaser.GameObjects.Image | null,
    centerX: number,
    labelText: Phaser.GameObjects.Text
  ): void {
    if (!valueText?.active || !labelText?.active) {
      return;
    }
    const valueY = valueText.y;
    const cardLeft = centerX - this.headerResourceCardWidth / 2;
    const contentLeft = cardLeft + 10;
    const contentRight = cardLeft + this.headerResourceCardWidth - 10;

    valueText.setOrigin(1, 0.5).setPosition(contentRight, valueY);

    if (!icon || !icon.active) {
      labelText.setOrigin(0, 0.5).setPosition(contentLeft, valueY);
      return;
    }
    const iconWidth = Math.max(1, icon.displayWidth || 14);
    const iconLabelGap = 4;
    const iconCenterX = contentLeft + iconWidth / 2;
    icon.setPosition(iconCenterX, valueY);

    const labelX = iconCenterX + iconWidth / 2 + iconLabelGap;
    labelText.setOrigin(0, 0.5).setPosition(labelX, valueY);

    const labelValueGap = 6;
    const valueLeftX = contentRight - valueText.width;
    const maxLabelWidth = Math.max(0, valueLeftX - labelValueGap - labelX);
    if (labelText.width > maxLabelWidth && maxLabelWidth > 0) {
      const scale = Phaser.Math.Clamp(maxLabelWidth / labelText.width, 0.75, 1);
      labelText.setScale(scale);
    } else {
      labelText.setScale(1);
    }
  }

  private renderNav(activePrimaryTab: PrimaryTabKey | null): void {
    this.navLayer.removeAll(true);

    const navBase = this.add.rectangle(195, 42, 390, 84, 0xf0e4c9, 0.96).setStrokeStyle(2, 0xcdbf9f);
    this.navLayer.add(navBase);

    const tabCount = TAB_ORDER.length;
    const horizontalPadding = 8;
    const gap = 4;
    const totalUsableWidth = 390 - horizontalPadding * 2;
    const buttonWidth = Math.floor((totalUsableWidth - gap * (tabCount - 1)) / tabCount);
    const buttonStartX = horizontalPadding + buttonWidth / 2;

    TAB_ORDER.forEach((tab, index) => {
      const isActive = activePrimaryTab === tab;
      const buttonCenterX = buttonStartX + index * (buttonWidth + gap);
      this.addButton(
        this.navLayer,
        buttonCenterX,
        42,
        buttonWidth,
        52,
        TAB_LABELS[tab],
        () => {
          if (this.activeTab !== tab) {
            this.commitSaveSnapshot(true);
            this.closeDecorGoalModal();
            this.closeDecorSlotEditModal();
            this.activeTab = tab;
            if (tab !== "collection") {
              this.selectedCollectionSpeciesId = null;
            }
            if (tab !== "home") {
              this.isHomeCustomizeGridOpen = false;
              this.isHomeAttendancePanelOpen = false;
            }
            if (tab !== "decorate") {
              this.isDecorClearMode = false;
              this.isDecorEditMode = false;
              this.selectedDecorSlotId = null;
            }
            this.renderAll();
          }
        },
        {
          enabled: true,
          fillColor: isActive ? 0x6d9b5f : 0xebe2c9,
          strokeColor: isActive ? 0x406431 : 0xb8aa8d,
          textColor: isActive ? "#ffffff" : "#4a4a41",
          fontSize: 18
        }
      );

      if (tab === "collection" && this.hasClaimableCollectionSetReward()) {
        const dotX = buttonCenterX + buttonWidth / 2 - 13;
        const dotY = 42 - 16;
        this.navLayer.add(this.add.circle(dotX, dotY, 7, 0xd94141, 1).setStrokeStyle(1, 0xffffff, 0.96));
      }
    });
  }

  private renderMain(): void {
    this.mainLayer.removeAll(true);
    this.homePotPulseTarget = null;
    const activePrimaryTab = isPrimaryTab(this.activeTab) ? this.activeTab : null;
    this.renderNav(activePrimaryTab);
    if (this.activeTab !== "decorate") {
      this.isDecorClearMode = false;
      this.closeDecorGoalModal();
      this.closeDecorSlotEditModal();
    } else if (!this.isDecorEditMode) {
      this.closeDecorSlotEditModal();
    }

    switch (this.activeTab) {
      case "home":
        this.renderHomePanel();
        break;
      case "collection":
        this.renderCollectionPanel();
        break;
      case "decorate":
        this.renderDecoratePanel();
        break;
      case "upgrade":
        this.renderAttendanceTab();
        break;
      case "shop":
        this.renderShopPanel();
        break;
      case "settings":
        this.renderSettingsPanel();
        break;
      default:
        break;
    }
  }

  private renderGardenBackground(panel: Phaser.GameObjects.Container, backgroundId: string): void {
    const fallbackBackground =
      BACKGROUND_BY_ID[HOME_DEFAULT_VIEW_BACKGROUND_ID] ??
      BACKGROUND_BY_ID[BACKGROUND_DEFS[0]?.id ?? ""] ??
      BACKGROUND_DEFS[0];
    const selectedBackground = BACKGROUND_BY_ID[backgroundId] ?? fallbackBackground;

    const selectedImageConfig =
      selectedBackground.id !== HOME_WINDOW_FRAME_BACKGROUND_ID ? BACKGROUND_IMAGE_CONFIG[selectedBackground.id] : undefined;
    const defaultImageConfig = BACKGROUND_IMAGE_CONFIG[HOME_DEFAULT_VIEW_BACKGROUND_ID];
    const sceneryImageConfig =
      selectedImageConfig && this.textures.exists(selectedImageConfig.textureKey)
        ? selectedImageConfig
        : defaultImageConfig && this.textures.exists(defaultImageConfig.textureKey)
          ? defaultImageConfig
          : undefined;
    const homeWindowImageFitMode: "contain" | "cover" = "cover";

    // Home tab keeps fixed UI background and shows scenery only inside the arched window.
    this.renderBasicUiBackground(panel);
    const windowRect = this.getHomeWindowRect2D();
    if (sceneryImageConfig) {
      this.addHomeWindowMaskedImage(
        panel,
        sceneryImageConfig.textureKey,
        windowRect.centerX,
        windowRect.centerY,
        windowRect.width,
        windowRect.height,
        homeWindowImageFitMode
      );
    } else {
      this.addHomeWindowArchFill(
        panel,
        windowRect.centerX,
        windowRect.centerY,
        windowRect.width,
        windowRect.height,
        hexToNumber(selectedBackground.skyBottomHex, HOME_WINDOW_GAP_FILL_COLOR),
        1
      );
    }
  }

  private renderBasicUiBackground(panel: Phaser.GameObjects.Container): void {
    if (this.textures.exists(ATTENDANCE_BACKGROUND_TEXTURE_KEY)) {
      panel.add(this.add.image(195, MAIN_HEIGHT / 2, ATTENDANCE_BACKGROUND_TEXTURE_KEY).setDisplaySize(MAIN_WIDTH, MAIN_HEIGHT));
      return;
    }
    panel.add(this.add.rectangle(195, MAIN_HEIGHT / 2, MAIN_WIDTH, MAIN_HEIGHT, 0xf8f2e3));
  }

  private renderGreenhouseDecorateBackground(panel: Phaser.GameObjects.Container): void {
    this.renderBasicUiBackground(panel);
  }

  private addContainedImage(
    parent: Phaser.GameObjects.Container,
    textureKey: string,
    centerX: number,
    centerY: number,
    maxWidth: number,
    maxHeight: number,
    fitMode: "contain" | "cover" = "contain"
  ): Phaser.GameObjects.Image {
    const image = this.add.image(centerX, centerY, textureKey);
    const sourceWidth = Math.max(1, Math.floor(image.width));
    const sourceHeight = Math.max(1, Math.floor(image.height));
    const scale =
      fitMode === "cover"
        ? Math.max(maxWidth / sourceWidth, maxHeight / sourceHeight)
        : Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    image.setDisplaySize(
      Math.max(1, Math.floor(sourceWidth * scale)),
      Math.max(1, Math.floor(sourceHeight * scale))
    );
    parent.add(image);
    return image;
  }

  private drawHomeWindowArchPath(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    const insetX = 6;
    const insetY = 1;
    const archWidth = Math.max(1, width - insetX * 2);
    const archHeight = Math.max(1, height - insetY * 2);
    const halfWidth = archWidth / 2;
    const left = centerX - halfWidth;
    const right = centerX + halfWidth;
    const bottom = centerY + archHeight / 2;
    const top = centerY - archHeight / 2;
    const radius = Math.max(4, Math.min(halfWidth, archHeight - 2));
    const archCenterY = top + radius;
    const verticalTopY = archCenterY;

    graphics.beginPath();
    graphics.moveTo(left, bottom);
    graphics.lineTo(left, verticalTopY);
    graphics.arc(centerX, archCenterY, radius, Math.PI, 0, false);
    graphics.lineTo(right, bottom);
    graphics.closePath();
  }

  private addHomeWindowArchFill(
    parent: Phaser.GameObjects.Container,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    fillColor: number,
    alpha = 1
  ): void {
    const fillShape = this.add.graphics();
    fillShape.fillStyle(fillColor, alpha);
    this.drawHomeWindowArchPath(fillShape, centerX, centerY, width, height);
    fillShape.fillPath();
    parent.add(fillShape);
  }

  private addHomeWindowMaskedImage(
    parent: Phaser.GameObjects.Container,
    textureKey: string,
    centerX: number,
    centerY: number,
    maxWidth: number,
    maxHeight: number,
    fitMode: "contain" | "cover" = "contain"
  ): void {
    const clippedTextureKey = this.createHomeWindowClippedTexture(textureKey, maxWidth, maxHeight, fitMode);
    if (!clippedTextureKey || !this.textures.exists(clippedTextureKey)) {
      return;
    }
    parent.add(this.add.image(centerX, centerY, clippedTextureKey));
  }

  private createHomeWindowClippedTexture(
    sourceTextureKey: string,
    maxWidth: number,
    maxHeight: number,
    fitMode: "contain" | "cover"
  ): string | null {
    if (!this.textures.exists(sourceTextureKey)) {
      return null;
    }

    const textureWidth = Math.max(1, Math.floor(maxWidth));
    const textureHeight = Math.max(1, Math.floor(maxHeight));
    const usePixelSampleWindowBackground = false;
    const signature = `v4:${sourceTextureKey}:${textureWidth}:${textureHeight}:${fitMode}:${usePixelSampleWindowBackground ? 1 : 0}`;
    const outputTextureKey = "home_window_clipped_content";
    if (this.homeWindowClippedTextureSignature === signature && this.textures.exists(outputTextureKey)) {
      return outputTextureKey;
    }

    if (this.textures.exists(outputTextureKey)) {
      this.textures.remove(outputTextureKey);
    }

    const canvasTexture = this.textures.createCanvas(outputTextureKey, textureWidth, textureHeight);
    if (!canvasTexture) {
      return null;
    }
    const ctx = canvasTexture.getContext();
    if (!ctx) {
      this.textures.remove(outputTextureKey);
      return null;
    }

    const sourceImage = this.textures.get(sourceTextureKey).getSourceImage() as CanvasImageSource & {
      width?: number;
      height?: number;
      videoWidth?: number;
      videoHeight?: number;
    };
    const sourceWidth = Math.max(1, Math.floor(sourceImage.width ?? sourceImage.videoWidth ?? textureWidth));
    const sourceHeight = Math.max(1, Math.floor(sourceImage.height ?? sourceImage.videoHeight ?? textureHeight));
    const scale =
      fitMode === "cover"
        ? Math.max(textureWidth / sourceWidth, textureHeight / sourceHeight)
        : Math.min(textureWidth / sourceWidth, textureHeight / sourceHeight);
    const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
    const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
    const drawX = Math.round((textureWidth - drawWidth) / 2);
    const drawY = Math.round((textureHeight - drawHeight) / 2);

    ctx.clearRect(0, 0, textureWidth, textureHeight);
    ctx.save();
    this.drawHomeWindowArchPathOnCanvas(ctx, textureWidth, textureHeight);
    ctx.clip();
    if (!usePixelSampleWindowBackground) {
      ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
    } else {
      const pixelScale = 0.13;
      const lowW = Math.max(1, Math.floor(textureWidth * pixelScale));
      const lowH = Math.max(1, Math.floor(textureHeight * pixelScale));
      const lowCanvas = document.createElement("canvas");
      lowCanvas.width = lowW;
      lowCanvas.height = lowH;
      const lowCtx = lowCanvas.getContext("2d");
      if (lowCtx) {
        lowCtx.imageSmoothingEnabled = true;
        lowCtx.clearRect(0, 0, lowW, lowH);
        const lowDrawX = Math.round(drawX * pixelScale);
        const lowDrawY = Math.round(drawY * pixelScale);
        const lowDrawW = Math.max(1, Math.round(drawWidth * pixelScale));
        const lowDrawH = Math.max(1, Math.round(drawHeight * pixelScale));
        lowCtx.drawImage(sourceImage, lowDrawX, lowDrawY, lowDrawW, lowDrawH);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(lowCanvas, 0, 0, lowW, lowH, 0, 0, textureWidth, textureHeight);
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
      }
    }
    ctx.restore();

    canvasTexture.refresh();
    this.homeWindowClippedTextureSignature = signature;
    return outputTextureKey;
  }

  private drawHomeWindowArchPathOnCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const insetX = 6;
    const insetY = 1;
    const archWidth = Math.max(1, width - insetX * 2);
    const archHeight = Math.max(1, height - insetY * 2);
    const halfWidth = archWidth / 2;
    const left = (width - archWidth) / 2;
    const right = left + archWidth;
    const top = (height - archHeight) / 2;
    const bottom = top + archHeight;
    const radius = Math.max(4, Math.min(halfWidth, archHeight - 2));
    const archCenterY = top + radius;
    const verticalTopY = archCenterY;

    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, verticalTopY);
    ctx.arc(width / 2, archCenterY, radius, Math.PI, 0, false);
    ctx.lineTo(right, bottom);
    ctx.closePath();
  }

  private getHomeWindowRect2D(): { centerX: number; centerY: number; width: number; height: number } {
    return {
      centerX: HOME_WINDOW_INNER_CENTER_X,
      centerY: HOME_WINDOW_INNER_CENTER_Y,
      width: HOME_WINDOW_INNER_WIDTH,
      height: HOME_WINDOW_INNER_HEIGHT
    };
  }

  private addPotPreviewImage(
    parent: Phaser.GameObjects.Container,
    potId: string,
    centerX: number,
    centerY: number,
    maxWidth: number,
    maxHeight: number
  ): boolean {
    const tryRenderByPotId = (targetPotId: string): boolean => {
      const textureKey = getPotPreviewTextureKey(targetPotId);
      if (!textureKey) {
        return false;
      }
      const cutoutTextureKey = getPotPreviewCutoutTextureKey(targetPotId);
      if (this.textures.exists(cutoutTextureKey)) {
        this.addContainedImage(parent, cutoutTextureKey, centerX, centerY, maxWidth, maxHeight);
        return true;
      }
      if (this.textures.exists(textureKey)) {
        this.addContainedImage(parent, textureKey, centerX, centerY, maxWidth, maxHeight);
        return true;
      }
      return false;
    };

    if (tryRenderByPotId(potId)) {
      return true;
    }

    const defaultPotId = POT_DEFS[0]?.id ?? "";
    if (defaultPotId && defaultPotId !== potId && tryRenderByPotId(defaultPotId)) {
      return true;
    }

    for (const fallbackPot of POT_DEFS) {
      if (fallbackPot.id === potId || fallbackPot.id === defaultPotId) {
        continue;
      }
      if (tryRenderByPotId(fallbackPot.id)) {
        return true;
      }
    }

    console.warn(`[assets] Failed to render pot preview texture for potId=${potId}`);
    return false;
  }

  private renderHomeShelf2D(parent: Phaser.GameObjects.Container, centerX: number, centerY: number): void {
    if (this.getIsUnifiedPixelStyleMode()) {
      const shelfWidth = 220;
      const shelfHeight = 18;
      const left = Math.round(centerX - shelfWidth / 2);
      const top = Math.round(centerY - shelfHeight / 2);
      const shelf = this.add.graphics();
      shelf.fillStyle(0x8c643f, 1);
      shelf.fillRect(left, top, shelfWidth, shelfHeight);
      shelf.fillStyle(0xb48355, 1);
      shelf.fillRect(left + 2, top + 2, shelfWidth - 4, 4);
      shelf.lineStyle(2, 0x6e4b2f, 1);
      shelf.strokeRect(left, top, shelfWidth, shelfHeight);
      parent.add(shelf);
      parent.add(this.add.rectangle(centerX, centerY + 10, shelfWidth - 18, 6, 0x5f4129, 0.28));
      return;
    }

    const shelfWidth = 212;
    const shelfHeight = 16;
    const left = centerX - shelfWidth / 2;
    const top = centerY - shelfHeight / 2;
    const woodBase = 0xb7824e;
    const woodDark = 0x8f6139;
    const woodLight = 0xd7a472;

    parent.add(this.add.ellipse(centerX, centerY + 9, shelfWidth * 0.88, 16, 0x4b2f1a, 0.16));

    const shelf = this.add.graphics();
    shelf.fillStyle(woodBase, 1);
    shelf.lineStyle(2, woodDark, 0.95);
    shelf.fillRoundedRect(left, top, shelfWidth, shelfHeight, 4);
    shelf.strokeRoundedRect(left, top, shelfWidth, shelfHeight, 4);
    shelf.fillStyle(woodLight, 0.5);
    shelf.fillRoundedRect(left + 6, top + 2, shelfWidth - 12, 4, 2);
    shelf.lineStyle(1, 0x9b6b42, 0.28);
    shelf.beginPath();
    shelf.moveTo(left + 20, top + shelfHeight / 2 + 1);
    shelf.lineTo(left + shelfWidth - 18, top + shelfHeight / 2 - 1);
    shelf.strokePath();
    parent.add(shelf);

    parent.add(this.add.circle(left + 36, centerY, 1.6, 0x8a5d36, 0.35));
    parent.add(this.add.circle(left + shelfWidth - 42, centerY + 1, 1.5, 0x8a5d36, 0.32));
  }

  private renderHomePot2D(parent: Phaser.GameObjects.Container, pot: { id?: string; colorHex: string; rimHex: string }): void {
    const preferredPotId = pot.id && POT_BY_ID[pot.id] ? pot.id : "pot_clay";
    const homeClayPotTextureKey = getPotPreviewTextureKey(preferredPotId);
    const homeClayPotCutoutTextureKey = getPotPreviewCutoutTextureKey(preferredPotId);
    const homePotImageKey =
      this.textures.exists(homeClayPotCutoutTextureKey)
        ? homeClayPotCutoutTextureKey
        : homeClayPotTextureKey && this.textures.exists(homeClayPotTextureKey)
          ? homeClayPotTextureKey
          : null;
    if (homePotImageKey) {
      parent.add(this.add.ellipse(0, 42, 88, 14, 0x4d2c17, 0.2));
      this.addContainedImage(parent, homePotImageKey, 0, 8, 176, 146);
      return;
    }

    if (this.getIsUnifiedPixelStyleMode()) {
      const potColor = hexToNumber(pot.colorHex, 0xb97849);
      const rimColor = hexToNumber(pot.rimHex, 0x8f5a36);
      const bodyDark = shiftColor(potColor, -22);
      const bodyLight = shiftColor(potColor, 16);
      const g = this.add.graphics();

      g.fillStyle(0x4d2c17, 0.2);
      g.fillRect(-40, 38, 80, 8);

      g.fillStyle(rimColor, 1);
      g.fillRect(-44, -30, 88, 14);
      g.fillStyle(shiftColor(rimColor, 14), 1);
      g.fillRect(-38, -27, 76, 4);
      g.lineStyle(2, shiftColor(rimColor, -18), 1);
      g.strokeRect(-44, -30, 88, 14);

      g.fillStyle(potColor, 1);
      const rows = [
        { y: -16, w: 70 },
        { y: -8, w: 66 },
        { y: 0, w: 62 },
        { y: 8, w: 58 },
        { y: 16, w: 56 },
        { y: 24, w: 54 },
        { y: 32, w: 52 },
        { y: 40, w: 50 }
      ];
      rows.forEach((row) => {
        g.fillRect(-row.w / 2, row.y, row.w, 8);
      });
      g.lineStyle(2, rimColor, 0.92);
      g.strokeRect(-35, -16, 70, 64);

      g.fillStyle(0x4f2d18, 1);
      g.fillRect(-30, -22, 60, 7);
      g.fillStyle(0x6b4023, 0.9);
      g.fillRect(-24, -24, 48, 3);
      g.fillStyle(bodyDark, 0.26);
      g.fillRect(10, -12, 12, 52);
      g.fillStyle(bodyLight, 0.22);
      g.fillRect(-24, -10, 10, 46);
      parent.add(g);
      return;
    }

    const potColor = hexToNumber(pot.colorHex, 0xb97849);
    const rimColor = hexToNumber(pot.rimHex, 0x8f5a36);
    const bodyDark = shiftColor(potColor, -26);
    const bodyLight = shiftColor(potColor, 22);
    const rimLight = shiftColor(rimColor, 18);
    const soilColor = 0x4f2d18;
    const soilEdgeColor = 0x6f4425;

    parent.add(this.add.ellipse(0, 42, 82, 13, 0x4d2c17, 0.2));

    const body = this.add.graphics();
    body.fillStyle(potColor, 1);
    body.lineStyle(2, rimColor, 0.95);
    body.beginPath();
    body.moveTo(-42, -18);
    body.lineTo(42, -18);
    body.lineTo(32, 52);
    body.lineTo(-32, 52);
    body.closePath();
    body.fillPath();
    body.strokePath();
    parent.add(body);

    parent.add(this.add.ellipse(0, -22, 108, 28, rimColor, 1).setStrokeStyle(2, shiftColor(rimColor, -16), 0.9));
    parent.add(this.add.ellipse(0, -22, 82, 18, shiftColor(potColor, 10), 1));
    parent.add(this.add.ellipse(0, -22, 72, 13, soilColor, 1).setStrokeStyle(1.2, soilEdgeColor, 0.75));
    parent.add(this.add.ellipse(0, -24, 58, 8, 0x5d371f, 0.96));
    parent.add(this.add.ellipse(-11, -25, 20, 5, 0x6f4426, 0.7).setAngle(-6));
    parent.add(this.add.ellipse(12, -23, 17, 4, 0x6b4023, 0.62).setAngle(8));
    parent.add(this.add.circle(-18, -24, 1.2, 0x8a6138, 0.55));
    parent.add(this.add.circle(-4, -22, 1.1, 0x8a6138, 0.52));
    parent.add(this.add.circle(8, -25, 1.05, 0x8a6138, 0.5));
    parent.add(this.add.circle(20, -22, 1.2, 0x7f5731, 0.52));

    const shade = this.add.graphics();
    shade.fillStyle(bodyDark, 0.22);
    shade.beginPath();
    shade.moveTo(10, -14);
    shade.lineTo(38, -14);
    shade.lineTo(28, 50);
    shade.lineTo(6, 50);
    shade.closePath();
    shade.fillPath();
    parent.add(shade);

    const highlight = this.add.graphics();
    highlight.fillStyle(bodyLight, 0.22);
    highlight.beginPath();
    highlight.moveTo(-34, -14);
    highlight.lineTo(-12, -14);
    highlight.lineTo(-17, 44);
    highlight.lineTo(-30, 44);
    highlight.closePath();
    highlight.fillPath();
    parent.add(highlight);

    parent.add(this.add.ellipse(-21, 5, 14, 8, rimLight, 0.24));
    parent.add(this.add.circle(6, 20, 1.4, shiftColor(rimColor, -10), 0.28));
    parent.add(this.add.circle(-8, 30, 1.2, shiftColor(rimColor, -12), 0.24));
    parent.add(this.add.circle(19, 36, 1.3, shiftColor(rimColor, -8), 0.24));
  }

  private renderHomePanel(): void {
    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);

    if (this.isHomeAttendancePanelOpen && this.homeTapEffectLayer?.active) {
      this.homeTapEffectLayer.removeAll(true);
    }

    const selectedSlot = this.getSelectedSlot() ?? this.saveData.garden.slots[0];
    const ownedHomePotIds = this.saveData.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]));
    const ownedHomeBackgroundIds = this.saveData.collection.ownedBackgroundIds.filter((backgroundId) =>
      Boolean(BACKGROUND_BY_ID[backgroundId])
    );
    const canCycleHomeBackground = ownedHomeBackgroundIds.length > 1;

    const previewBackgroundId = this.isHomeCustomizeGridOpen ? this.selectedCustomizeBackgroundId : this.saveData.garden.backgroundId;
    const backgroundIdForRender = BACKGROUND_BY_ID[previewBackgroundId] ? previewBackgroundId : this.saveData.garden.backgroundId;
    const previewPotId = this.isHomeCustomizeGridOpen ? this.selectedCustomizePotId : selectedSlot?.potId ?? POT_DEFS[0]?.id ?? "";
    const potIdForRender =
      POT_BY_ID[previewPotId] ? previewPotId : selectedSlot?.potId ?? POT_DEFS[0]?.id ?? "";

    this.renderGardenBackground(panel, backgroundIdForRender);
    this.renderHomeWindowOverlay(panel);
    this.renderHomeShelf2D(panel, 195, 542);

    const heroCenterX = CLICKER_CENTER_X;
    const heroCenterY = CLICKER_CENTER_Y;
    const homePotCenterY = heroCenterY + 52;
    const homeSoilTopY = homePotCenterY - 32;
    const tapZoneWidth = 236;
    const tapZoneHeight = 260;
    const tapZoneCenterY = heroCenterY + 36;
    const tapZone = this.add
      .rectangle(heroCenterX, tapZoneCenterY, tapZoneWidth, tapZoneHeight, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    tapZone.on("pointerdown", () => {
      this.handleHeroTap();
    });
    panel.add(tapZone);

    const activeSlot = selectedSlot ?? this.saveData.garden.slots[0];
    const pot = POT_BY_ID[potIdForRender] ?? POT_DEFS[0];
    const potVisual = this.add.container(heroCenterX, homePotCenterY);
    panel.add(potVisual);
    this.renderHomePot2D(potVisual, pot);
    this.homePotPulseTarget = potVisual;

    const homeActionButtonY = 30;
    const homeCustomizeButtonX = 312;
    const homeAttendanceButtonX = 356;
    const hasClaimedAttendance = this.hasClaimedAttendanceToday();

    this.addHomeCustomizeIconButton(
      panel,
      homeCustomizeButtonX,
      homeActionButtonY,
      38,
      32,
      () => {
        if (this.isHomeCustomizeGridOpen) {
          this.commitHomeCustomizeSelection();
          return;
        }
        this.openHomeCustomizeSelection();
      },
      {
        isClaimed: hasClaimedAttendance
      }
    );

    this.addAttendanceIconButton(
      panel,
      homeAttendanceButtonX,
      homeActionButtonY,
      38,
      32,
      () => {
        this.isHomeAttendancePanelOpen = !this.isHomeAttendancePanelOpen;
        if (this.isHomeAttendancePanelOpen) {
          this.isHomeCustomizeGridOpen = false;
          this.attendancePreviewDay = this.getAttendanceNextDay();
        }
        this.renderMain();
      },
      {
        isClaimed: hasClaimedAttendance
      }
    );

    if (this.isHomeCustomizeGridOpen) {
      const windowRect = this.getHomeWindowRect2D();
      const windowCenterY = windowRect.centerY;
      const sharedArrowOffsetX = 134;
      const windowCenterX = heroCenterX;
      const windowArrowY = windowCenterY + 4;

      this.addTriangleArrowButton(
        panel,
        windowCenterX - sharedArrowOffsetX,
        windowArrowY,
        "right",
        () => {
          this.shiftCustomizeBackground(-1);
        },
        canCycleHomeBackground
      ).setScale(1.32);
      this.addTriangleArrowButton(
        panel,
        windowCenterX + sharedArrowOffsetX + 20,
        windowArrowY,
        "left",
        () => {
          this.shiftCustomizeBackground(1);
        },
        canCycleHomeBackground
      ).setScale(1.32);

      const potCenterY = homePotCenterY;
      const potArrowY = potCenterY + 6;
      this.addTriangleArrowButton(
        panel,
        heroCenterX - sharedArrowOffsetX,
        potArrowY,
        "right",
        () => {
          this.shiftCustomizePot(-1);
        },
        true
      ).setScale(1.32);
      this.addTriangleArrowButton(
        panel,
        heroCenterX + sharedArrowOffsetX + 20,
        potArrowY,
        "left",
        () => {
          this.shiftCustomizePot(1);
        },
        true
      ).setScale(1.32);
    }

    let statusText = "심기 버튼을 누르면 랜덤 꽃이 자랍니다.";
    let progress = 0;
    let plantedSpeciesForEffects: PlantSpeciesDef | null = null;
    const shouldRenderHomePlantVisual = !this.isHomeAttendancePanelOpen;
    if (activeSlot.planted) {
      const species = PLANT_BY_ID[activeSlot.planted.speciesId] ?? AVAILABLE_PLANT_SPECIES_DEFS[0] ?? PLANT_SPECIES_DEFS[0];
      plantedSpeciesForEffects = species;
      const stage = getPlantStage(activeSlot.planted, Date.now());
      progress = Math.min(1, Math.max(0, (activeSlot.planted.growSeconds - getRemainingGrowSeconds(activeSlot.planted, Date.now())) / activeSlot.planted.growSeconds));

      if (shouldRenderHomePlantVisual) {
        const soilTopY = homeSoilTopY;

        const didRenderStageImage = this.renderHomeSproutStageImage(
          panel,
          heroCenterX,
          soilTopY,
          stage,
          activeSlot.planted.speciesId
        );
        if (!didRenderStageImage) {
          if (stage === 1) {
            const stem = this.add.graphics();
            stem.lineStyle(4, hexToNumber(species.stemColorHex), 1);
            stem.beginPath();
            stem.moveTo(heroCenterX - 2, soilTopY - 2);
            stem.lineTo(heroCenterX + 3, soilTopY - 14);
            stem.lineTo(heroCenterX + 2, soilTopY - 28);
            stem.lineTo(heroCenterX - 10, soilTopY - 44);
            stem.strokePath();
            panel.add(stem);

            panel.add(this.add.ellipse(heroCenterX - 15, soilTopY - 45, 18, 10, 0x97ca6e).setAngle(-20));
          }

          if (stage >= 2) {
            const stemHeight = stage >= 3 ? 66 : 52;
            const stemTopY = soilTopY - stemHeight;

            const stem = this.add.graphics();
            stem.lineStyle(4, hexToNumber(species.stemColorHex), 1);
            stem.beginPath();
            stem.moveTo(heroCenterX, soilTopY - 2);
            stem.lineTo(heroCenterX - 1, soilTopY - Math.floor(stemHeight * 0.36));
            stem.lineTo(heroCenterX - 1, soilTopY - Math.floor(stemHeight * 0.68));
            stem.lineTo(heroCenterX, stemTopY);
            stem.strokePath();
            panel.add(stem);

            panel.add(this.add.ellipse(heroCenterX - 12, stemTopY + 2, 18, 10, 0x9acd70).setAngle(-24));
            panel.add(this.add.ellipse(heroCenterX + 12, stemTopY + 2, 18, 10, 0x90c467).setAngle(24));

            if (stage >= 3) {
              panel.add(this.add.ellipse(heroCenterX - 16, stemTopY + 18, 16, 9, 0x86ba60).setAngle(-34));
              panel.add(this.add.ellipse(heroCenterX + 16, stemTopY + 16, 16, 9, 0x80b559).setAngle(34));
            }

            if (stage >= 3) {
              const bloomColor = hexToNumber(species.bloomColorHex);
              const bloomY = stemTopY - 14;
              panel.add(this.add.circle(heroCenterX, bloomY, 18, bloomColor));
              panel.add(this.add.circle(heroCenterX - 14, bloomY + 4, 11, bloomColor, 0.92));
              panel.add(this.add.circle(heroCenterX + 14, bloomY + 4, 11, bloomColor, 0.92));
            }
          }
        }
      }

      if (isPlantHarvestable(activeSlot.planted, Date.now())) {
        statusText = "꽃이 개화 완료되었습니다! 수확 버튼으로 코인을 획득하세요.";
      } else {
        statusText = `성장 중 · 남은 ${formatSeconds(getRemainingGrowSeconds(activeSlot.planted, Date.now()))}`;
      }
    } else if (!this.getRandomPlantSpecies()) {
      statusText = "보유한 씨앗이 없습니다. 상점에서 씨앗을 구매하세요.";
    }

    panel.add(
      this.add
        .text(heroCenterX, CLICKER_STATUS_Y, statusText, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#554f41",
          wordWrap: { width: 320 }
        })
        .setOrigin(0.5)
    );

    this.renderHomeGrowthProgressBar(panel, heroCenterX, CLICKER_PROGRESS_Y, progress);

    const canPlant = !activeSlot.planted && this.getRandomPlantSpecies() !== null;
    const canHarvest = Boolean(activeSlot.planted && isPlantHarvestable(activeSlot.planted, Date.now()));
    if (canHarvest && !this.wasHomePlantHarvestable && plantedSpeciesForEffects && !this.isHomeAttendancePanelOpen) {
      this.playHomeBloomReadyEffects(plantedSpeciesForEffects);
    }
    this.wasHomePlantHarvestable = canHarvest;

    this.addButton(
      panel,
      195,
      CLICKER_ACTION_BUTTON_Y,
      146,
      34,
      canHarvest ? "수확" : "심기",
      () => {
        if (canHarvest) {
          this.harvestSelectedSlot();
        } else {
          this.plantToSelectedSlot();
        }
      },
      {
        enabled: canHarvest || canPlant,
        fillColor: canHarvest ? 0xca7d3a : 0x4f8d4a,
        textColor: "#ffffff",
        textStrokeColor: "#2b3927",
        textStrokeThickness: 2.4,
        fontSize: 15,
        textOffsetY: 0.5
      }
    );

    if (this.isHomeAttendancePanelOpen) {
      this.renderHomeAttendanceOverlay(panel);
    }

  }

  private renderHomeCustomizeModal(
    panel: Phaser.GameObjects.Container,
    canCycleHomePot: boolean,
    canCycleHomeBackground: boolean
  ): void {
    const ownedPotIds = this.saveData.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]));
    const ownedBackgroundIds = this.saveData.collection.ownedBackgroundIds.filter((backgroundId) =>
      Boolean(BACKGROUND_BY_ID[backgroundId])
    );
    const selectedPot = POT_BY_ID[this.selectedCustomizePotId] ?? POT_BY_ID[ownedPotIds[0] ?? ""] ?? POT_DEFS[0];
    const selectedBackground =
      BACKGROUND_BY_ID[this.selectedCustomizeBackgroundId] ?? BACKGROUND_BY_ID[ownedBackgroundIds[0] ?? ""] ?? BACKGROUND_DEFS[0];

    const scrim = this.add
      .rectangle(195, MAIN_HEIGHT / 2, 390, MAIN_HEIGHT, 0x1f261f, 0.52)
      .setInteractive({ useHandCursor: true });
    scrim.on("pointerup", () => undefined);
    panel.add(scrim);

    panel.add(this.add.rectangle(195, 442, 336, 396, 0xfff8eb, 0.99).setStrokeStyle(2, 0xbda57f));
    this.addCollectionCloseButton(panel, 332, 254, () => {
      this.isHomeCustomizeGridOpen = false;
      this.renderMain();
    });

    panel.add(
      this.add
        .text(56, 264, "홈 편집", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "32px",
          color: "#394637",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(56, 300, "배경/화분을 미리 본 뒤 저장하세요.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#6a6d61"
        })
        .setOrigin(0, 0)
    );

    panel.add(this.add.rectangle(195, 368, 246, 106, 0xf5f1e6).setStrokeStyle(2, 0xcbbd9f, 0.96));
    const previewConfig = BACKGROUND_IMAGE_CONFIG[selectedBackground.id];
    if (previewConfig && this.textures.exists(previewConfig.textureKey)) {
      this.addContainedImage(panel, previewConfig.textureKey, 195, 368, 236, 96);
    } else {
      panel.add(this.add.rectangle(195, 354, 236, 44, hexToNumber(selectedBackground.skyTopHex), 1));
      panel.add(this.add.rectangle(195, 378, 236, 26, hexToNumber(selectedBackground.skyBottomHex), 0.95));
      panel.add(this.add.rectangle(195, 398, 236, 22, hexToNumber(selectedBackground.groundHex), 1));
    }

    panel.add(this.add.rectangle(195, 456, 138, 84, 0xf5f1e6, 0.98).setStrokeStyle(2, 0xcbbd9f, 0.96));
    if (!this.addPotPreviewImage(panel, selectedPot.id, 195, 458, 118, 78)) {
      panel.add(this.add.ellipse(195, 460, 94, 36, hexToNumber(selectedPot.colorHex), 0.98).setStrokeStyle(2, hexToNumber(selectedPot.rimHex)));
      panel.add(this.add.ellipse(195, 448, 96, 12, hexToNumber(selectedPot.rimHex), 0.68));
    }

    const addSelectorRow = (
      label: string,
      y: number,
      value: string,
      onPrev: () => void,
      onNext: () => void,
      enabled: boolean
    ): void => {
      panel.add(
        this.add
          .text(64, y - 8, label, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "16px",
            color: "#4f5647",
            fontStyle: "700"
          })
          .setOrigin(0, 0.5)
      );
      this.addButton(panel, 114, y, 48, 34, "이전", onPrev, {
        enabled,
        fillColor: 0x6f8465,
        textColor: "#ffffff",
        fontSize: 12
      });
      panel.add(this.add.rectangle(195, y, 122, 34, 0xf9f5ea, 1).setStrokeStyle(2, 0xc8bda3, 0.96));
      panel.add(
        this.add
          .text(195, y, value, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "14px",
            color: "#4f5647",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      this.addButton(panel, 276, y, 48, 34, "다음", onNext, {
        enabled,
        fillColor: 0x6f8465,
        textColor: "#ffffff",
        fontSize: 12
      });
    };

    addSelectorRow("배경", 516, selectedBackground.nameKo, () => this.shiftCustomizeBackground(-1), () => this.shiftCustomizeBackground(1), canCycleHomeBackground);
    addSelectorRow("화분", 560, selectedPot.nameKo, () => this.shiftCustomizePot(-1), () => this.shiftCustomizePot(1), canCycleHomePot);

    this.addButton(
      panel,
      140,
      606,
      124,
      38,
      "취소",
      () => {
        this.isHomeCustomizeGridOpen = false;
        this.renderMain();
      },
      {
        fillColor: 0xd2c8b2,
        strokeColor: 0xb2a37f,
        textColor: "#4e5147",
        fontSize: 16
      }
    );
    this.addButton(
      panel,
      250,
      606,
      124,
      38,
      "저장",
      () => {
        this.commitHomeCustomizeSelection();
      },
      {
        fillColor: 0x5c8a57,
        strokeColor: 0x3f6a3a,
        textColor: "#ffffff",
        fontSize: 16
      }
    );
  }

  private renderHomeWindowOverlay(panel: Phaser.GameObjects.Container): void {
    const inner = this.getHomeWindowRect2D();
    const usePixelSampleWindowFrame = false;
    if (this.getIsUnifiedPixelStyleMode() && usePixelSampleWindowFrame) {
      const frame = this.add.graphics();
      const outerW = inner.width + 30;
      const outerH = inner.height + 26;
      const left = Math.round(inner.centerX - outerW / 2);
      const right = Math.round(inner.centerX + outerW / 2);
      const top = Math.round(inner.centerY - outerH / 2);
      const bottom = Math.round(inner.centerY + outerH / 2);
      const border = 8;

      frame.fillStyle(0xefe6d1, 1);
      frame.fillRect(left, top + 28, border, bottom - (top + 28));
      frame.fillRect(right - border, top + 28, border, bottom - (top + 28));
      frame.fillRect(left + 12, bottom - border, outerW - 24, border);

      const archSteps = [0, 8, 16, 24, 30, 34];
      archSteps.forEach((inset, idx) => {
        const y = top + idx * 6;
        const width = outerW - inset * 2;
        frame.fillRect(inner.centerX - width / 2, y, width, 6);
      });

      frame.lineStyle(2, 0xcbbb9f, 1);
      frame.strokeRect(left, top + 28, border, bottom - (top + 28));
      frame.strokeRect(right - border, top + 28, border, bottom - (top + 28));
      frame.strokeRect(left + 12, bottom - border, outerW - 24, border);
      panel.add(frame);
      return;
    }

    const outerWidth = inner.width + 34;
    const outerHeight = inner.height + 30;

    panel.add(this.add.ellipse(inner.centerX, inner.centerY + outerHeight / 2 - 8, outerWidth * 0.78, 14, 0x6a4f33, 0.1));

    const outerFrame = this.add.graphics();
    outerFrame.lineStyle(14, 0xf1ebdc, 0.98);
    this.drawHomeWindowArchPath(outerFrame, inner.centerX, inner.centerY, outerWidth, outerHeight);
    outerFrame.strokePath();
    outerFrame.lineStyle(3, 0xd0c0a2, 0.95);
    this.drawHomeWindowArchPath(outerFrame, inner.centerX, inner.centerY, outerWidth, outerHeight);
    outerFrame.strokePath();
    panel.add(outerFrame);

    const innerEdge = this.add.graphics();
    innerEdge.lineStyle(2, 0xffffff, 0.7);
    this.drawHomeWindowArchPath(innerEdge, inner.centerX, inner.centerY, outerWidth - 10, outerHeight - 10);
    innerEdge.strokePath();
    panel.add(innerEdge);

  }

  private renderHomeSproutStageImage(
    panel: Phaser.GameObjects.Container,
    centerX: number,
    soilTopY: number,
    stage: number,
    speciesId?: string
  ): boolean {
    const rawStage = Math.floor(stage);
    if (rawStage <= 0) {
      return false;
    }
    const stageKey = Math.max(1, Math.min(4, rawStage));

    const stageConfigs = {
      1: {
        // Stage 1 is now closer to the old stage 2, per request for a more visible early growth step.
        stemHeight: 28,
        tipX: -1,
        controlX: -3,
        stemColor: 0x67984f,
        stemWidth: 3.4,
        leaves: [
          { x: -9, y: 22, width: 20, height: 10, angle: -28, color: 0x9fd173 },
          { x: 10, y: 20, width: 20, height: 10, angle: 26, color: 0x98cb6e },
          { x: -2, y: 12, width: 14, height: 8, angle: -8, color: 0x8fc565 }
        ],
        bud: { x: 0, y: 30, width: 9, height: 9, color: 0x88bc61 }
      },
      2: {
        stemHeight: 38,
        tipX: 0,
        controlX: -2,
        stemColor: 0x628f4b,
        stemWidth: 3.5,
        leaves: [
          { x: -12, y: 31, width: 24, height: 12, angle: -30, color: 0x93c869 },
          { x: 12, y: 29, width: 24, height: 12, angle: 30, color: 0x8bc261 },
          { x: -10, y: 21, width: 18, height: 9, angle: -18, color: 0x85bc5c },
          { x: 11, y: 19, width: 18, height: 9, angle: 18, color: 0x7eb555 }
        ],
        bud: { x: 1, y: 44, width: 11, height: 11, color: 0x7fb756 }
      },
      3: {
        // Stage 3: closed bud stage
        stemHeight: 54,
        tipX: 1,
        controlX: -1,
        stemColor: 0x588545,
        stemWidth: 3.9,
        leaves: [
          { x: -17, y: 44, width: 30, height: 15, angle: -30, color: 0x8bc262 },
          { x: 17, y: 42, width: 30, height: 15, angle: 30, color: 0x84bb5c },
          { x: -13, y: 30, width: 23, height: 11, angle: -20, color: 0x7eb556 },
          { x: 13, y: 29, width: 23, height: 11, angle: 20, color: 0x78ae51 },
          { x: 0, y: 19, width: 16, height: 8, angle: 0, color: 0x72a84c }
        ],
        bud: { x: 2, y: 65, width: 14, height: 20, color: 0x76ad50 }
      },
      4: {
        // Stage 4: compact bloom stage
        stemHeight: 58,
        tipX: 1,
        controlX: -1,
        stemColor: 0x587f44,
        stemWidth: 4.1,
        leaves: [
          { x: -22, y: 50, width: 34, height: 15, angle: -34, color: 0x8bc262 },
          { x: 22, y: 49, width: 34, height: 15, angle: 34, color: 0x84bb5b },
          { x: -9, y: 35, width: 22, height: 10, angle: -24, color: 0x7db455 },
          { x: 9, y: 34, width: 22, height: 10, angle: 24, color: 0x77ad50 }
        ],
        bud: { x: 1, y: 66, width: 18, height: 17, color: 0x79b255 }
      }
    }[stageKey] ?? {
      stemHeight: 18,
      tipX: -3,
      controlX: -4,
      stemColor: 0x6e9f54,
      stemWidth: 3.2,
      leaves: [] as { x: number; y: number; width: number; height: number; angle: number; color: number }[],
      bud: { x: -2, y: 19, width: 8, height: 8, color: 0x98c86d }
    };

    const speciesBloomColor =
      speciesId && PLANT_BY_ID[speciesId]
        ? hexToNumber(PLANT_BY_ID[speciesId].bloomColorHex, 0xf06f87)
        : 0xf06f87;

    const stem = this.add.graphics();
    stem.lineStyle(stageConfigs.stemWidth, stageConfigs.stemColor, 1);
    stem.beginPath();
    const midStemY = soilTopY - Math.floor(stageConfigs.stemHeight * 0.52);
    stem.moveTo(centerX, soilTopY - 1);
    stem.lineTo(centerX + Math.floor(stageConfigs.controlX * 0.5), midStemY);
    stem.lineTo(centerX + stageConfigs.tipX, soilTopY - stageConfigs.stemHeight);
    stem.strokePath();
    panel.add(stem);

    stageConfigs.leaves.forEach((leaf) => {
      panel.add(
        this.add
          .ellipse(centerX + leaf.x, soilTopY - leaf.y, leaf.width, leaf.height, leaf.color)
          .setAngle(leaf.angle)
          .setStrokeStyle(1, 0x6f9a4f, 0.45)
      );
    });

    panel.add(
      this.add
        .ellipse(
          centerX + stageConfigs.bud.x,
          soilTopY - stageConfigs.bud.y,
          stageConfigs.bud.width,
          stageConfigs.bud.height,
          stageConfigs.bud.color
        )
        .setStrokeStyle(1, 0x669147, 0.45)
    );
    if (stageKey === 3) {
      // Closed bud emphasis
      panel.add(
        this.add
          .ellipse(centerX + stageConfigs.bud.x, soilTopY - stageConfigs.bud.y + 1, 16, 24, shiftColor(stageConfigs.bud.color, 12), 0.88)
          .setStrokeStyle(1, 0x6f9d50, 0.45)
      );
      panel.add(this.add.ellipse(centerX + stageConfigs.bud.x - 7, soilTopY - stageConfigs.bud.y + 9, 10, 7, 0x6ea64a, 0.76).setAngle(-26));
      panel.add(this.add.ellipse(centerX + stageConfigs.bud.x + 7, soilTopY - stageConfigs.bud.y + 9, 10, 7, 0x6ea64a, 0.76).setAngle(26));
    }
    if (stageKey === 4) {
      // Open bloom emphasis
      const bloomCenterX = centerX + stageConfigs.bud.x;
      const bloomCenterY = soilTopY - stageConfigs.bud.y + 1;
      const bloomColorR = (speciesBloomColor >> 16) & 0xff;
      const bloomColorG = (speciesBloomColor >> 8) & 0xff;
      const bloomColorB = speciesBloomColor & 0xff;
      const normalizedBloomColor =
        bloomColorG > bloomColorR + 20 && bloomColorG > bloomColorB + 20 ? 0xf07f97 : speciesBloomColor;
      const petalColorOuter = shiftColor(normalizedBloomColor, 8);
      const petalColorInner = shiftColor(normalizedBloomColor, 18);
      const petalShadow = shiftColor(normalizedBloomColor, -18);

      // Draw calyx first so it stays behind white petals in final bloom stage.
      panel.add(
        this.add
          .ellipse(bloomCenterX - 9, bloomCenterY + 11, 12, 6, 0x79b352, 0.92)
          .setAngle(-28)
          .setStrokeStyle(1, 0x5d8b3f, 0.42)
      );
      panel.add(
        this.add
          .ellipse(bloomCenterX + 9, bloomCenterY + 11, 12, 6, 0x79b352, 0.92)
          .setAngle(28)
          .setStrokeStyle(1, 0x5d8b3f, 0.42)
      );

      const backPetals = [
        { x: -12, y: -3, w: 14, h: 20, angle: -28 },
        { x: 0, y: -6, w: 15, h: 22, angle: 0 },
        { x: 12, y: -3, w: 14, h: 20, angle: 28 }
      ];
      backPetals.forEach((petal) => {
        panel.add(
          this.add
            .ellipse(bloomCenterX + petal.x, bloomCenterY + petal.y, petal.w, petal.h, petalColorOuter, 0.95)
            .setAngle(petal.angle)
            .setStrokeStyle(1, petalShadow, 0.45)
        );
      });

      const frontPetals = [
        { x: -14, y: 4, w: 13, h: 19, angle: -38 },
        { x: -7, y: 6, w: 13, h: 20, angle: -18 },
        { x: 0, y: 7, w: 14, h: 21, angle: 0 },
        { x: 7, y: 6, w: 13, h: 20, angle: 18 },
        { x: 14, y: 4, w: 13, h: 19, angle: 38 }
      ];
      frontPetals.forEach((petal) => {
        panel.add(
          this.add
            .ellipse(bloomCenterX + petal.x, bloomCenterY + petal.y, petal.w, petal.h, petalColorInner, 0.96)
            .setAngle(petal.angle)
            .setStrokeStyle(1, shiftColor(petalColorInner, -14), 0.48)
        );
      });

      panel.add(this.add.ellipse(bloomCenterX, bloomCenterY + 7, 18, 7, shiftColor(normalizedBloomColor, -22), 0.32));
      panel.add(this.add.circle(bloomCenterX, bloomCenterY + 1, 4.6, 0xe6c44f, 0.95));
    }

    return true;
  }

  private renderHomeSproutStagePixelSample(
    panel: Phaser.GameObjects.Container,
    centerX: number,
    soilTopY: number,
    stage: number
  ): boolean {
    const stageKey = Math.max(1, Math.min(4, Math.floor(stage)));
    if (stageKey <= 0) {
      return false;
    }
    const stemHeight = [0, 18, 28, 38, 50][stageKey] ?? 18;
    const stemWidth = stageKey >= 3 ? 4 : 3;
    const stemLeft = Math.round(centerX - stemWidth / 2);
    const stemTop = Math.round(soilTopY - stemHeight);
    panel.add(this.add.rectangle(stemLeft + stemWidth / 2, stemTop + stemHeight / 2, stemWidth, stemHeight + 1, 0x5f9347, 1));

    const addLeaf = (x: number, y: number, w: number, h: number, color: number): void => {
      panel.add(this.add.rectangle(Math.round(centerX + x), Math.round(soilTopY - y), w, h, color, 1));
    };
    if (stageKey >= 1) {
      addLeaf(-7, 12, 9, 5, 0x86bd5d);
      addLeaf(7, 10, 9, 5, 0x80b857);
    }
    if (stageKey >= 2) {
      addLeaf(-10, 20, 11, 6, 0x91c968);
      addLeaf(10, 18, 11, 6, 0x8ac361);
    }
    if (stageKey >= 3) {
      addLeaf(-12, 30, 12, 7, 0x84bc5d);
      addLeaf(12, 28, 12, 7, 0x7eb658);
    }
    if (stageKey >= 4) {
      addLeaf(0, 40, 10, 6, 0x78b251);
    }
    panel.add(this.add.rectangle(Math.round(centerX), Math.round(soilTopY - stemHeight - 4), 8, 8, 0x74ad4f, 1));
    return true;
  }

  private renderCustomizePanel(): void {
    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);
    this.ensureCustomizeSelections();

    panel.add(this.add.rectangle(195, MAIN_HEIGHT / 2, 390, MAIN_HEIGHT, 0xf2efe6));

    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_TITLE_Y, "꾸미기", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: TAB_TITLE_FONT_SIZE,
          color: "#3d4a3b",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_SUBTITLE_Y, "보유한 화분과 배경을 골라 홈 화면 스타일을 바꿔보세요.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#5f6f5b"
        })
        .setOrigin(0, 0)
    );

    const ownedPotIds = this.saveData.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]));
    const ownedBackgroundIds = this.saveData.collection.ownedBackgroundIds.filter((backgroundId) => Boolean(BACKGROUND_BY_ID[backgroundId]));
    const selectedPot = POT_BY_ID[this.selectedCustomizePotId] ?? POT_BY_ID[ownedPotIds[0] ?? ""] ?? POT_DEFS[0];
    const selectedBackground =
      BACKGROUND_BY_ID[this.selectedCustomizeBackgroundId] ?? BACKGROUND_BY_ID[ownedBackgroundIds[0] ?? ""] ?? BACKGROUND_DEFS[0];
    const appliedPotId = this.getSelectedSlot()?.potId ?? selectedPot?.id ?? "";
    const appliedBackgroundId = this.saveData.garden.backgroundId;

    panel.add(this.add.rectangle(195, 204, 352, 182, 0xfffbef).setStrokeStyle(2, 0xc8bda3));
    panel.add(
      this.add
        .text(34, 128, "화분 디자인", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "18px",
          color: "#4d5a48",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    const renderedCustomizePotImage = this.addPotPreviewImage(panel, selectedPot.id, 86, 206, 88, 70);
    if (!renderedCustomizePotImage) {
      panel.add(
        this.add.ellipse(86, 208, 82, 36, hexToNumber(selectedPot.colorHex), 0.98).setStrokeStyle(2, hexToNumber(selectedPot.rimHex))
      );
      panel.add(this.add.ellipse(86, 200, 88, 12, hexToNumber(selectedPot.rimHex), 0.66));
    }

    panel.add(
      this.add
        .text(
          140,
          166,
          selectedPot.nameKo,
          {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "15px",
            color: "#4a5143",
            fontStyle: "700"
          }
        )
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(140, 188, `보유 ${ownedPotIds.length}종`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#6b6a5b"
        })
        .setOrigin(0, 0)
    );

    this.addButton(
      panel,
      246,
      209,
      34,
      28,
      "◀",
      () => {
        this.shiftCustomizePot(-1);
      },
      { fillColor: 0x6b7f5d, textColor: "#ffffff", fontSize: 12 }
    );
    this.addButton(
      panel,
      284,
      209,
      34,
      28,
      "▶",
      () => {
        this.shiftCustomizePot(1);
      },
      { fillColor: 0x6b7f5d, textColor: "#ffffff", fontSize: 12 }
    );
    this.addButton(
      panel,
      324,
      209,
      58,
      28,
      appliedPotId === selectedPot.id ? "적용중" : "적용",
      () => {
        this.equipCustomizePot(selectedPot.id);
      },
      {
        enabled: appliedPotId !== selectedPot.id,
        fillColor: 0x5d865a,
        textColor: "#ffffff",
        fontSize: 12
      }
    );

    panel.add(this.add.rectangle(195, 430, 352, 182, 0xfffbef).setStrokeStyle(2, 0xc8bda3));
    panel.add(
      this.add
        .text(34, 354, "배경 디자인", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "18px",
          color: "#4d5a48",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    const customizeBackgroundPreview = BACKGROUND_IMAGE_CONFIG[selectedBackground.id];
    if (customizeBackgroundPreview && this.textures.exists(customizeBackgroundPreview.textureKey)) {
      panel.add(this.add.rectangle(86, 431, 102, 70, 0xf5f2e8).setStrokeStyle(1, 0xb7ab92, 0.9));
      this.addContainedImage(panel, customizeBackgroundPreview.textureKey, 86, 431, 98, 66);
    } else {
      panel.add(this.add.rectangle(86, 424, 96, 62, hexToNumber(selectedBackground.skyTopHex), 1));
      panel.add(this.add.rectangle(86, 438, 96, 18, hexToNumber(selectedBackground.skyBottomHex), 0.9));
      panel.add(this.add.rectangle(86, 453, 96, 20, hexToNumber(selectedBackground.groundHex), 1));
    }

    panel.add(
      this.add
        .text(140, 392, selectedBackground.nameKo, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "15px",
          color: "#4a5143",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(140, 414, `보유 ${ownedBackgroundIds.length}종`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#6b6a5b"
        })
        .setOrigin(0, 0)
    );

    this.addButton(
      panel,
      246,
      431,
      34,
      28,
      "◀",
      () => {
        this.shiftCustomizeBackground(-1);
      },
      { fillColor: 0x6b7f5d, textColor: "#ffffff", fontSize: 12 }
    );
    this.addButton(
      panel,
      284,
      431,
      34,
      28,
      "▶",
      () => {
        this.shiftCustomizeBackground(1);
      },
      { fillColor: 0x6b7f5d, textColor: "#ffffff", fontSize: 12 }
    );
    this.addButton(
      panel,
      324,
      431,
      58,
      28,
      appliedBackgroundId === selectedBackground.id ? "적용중" : "적용",
      () => {
        this.equipBackground(selectedBackground.id);
      },
      {
        enabled: appliedBackgroundId !== selectedBackground.id,
        fillColor: 0x5d865a,
        textColor: "#ffffff",
        fontSize: 12
      }
    );
  }

  private renderHomeGrowthProgressBar(
    panel: Phaser.GameObjects.Container,
    centerX: number,
    centerY: number,
    progress: number
  ): void {
    const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);
    if (this.getIsUnifiedPixelStyleMode()) {
      const frameWidth = 270;
      const frameHeight = 16;
      const left = Math.round(centerX - frameWidth / 2);
      const top = Math.round(centerY - frameHeight / 2);
      const fillWidth = Math.max(0, Math.floor((frameWidth - 8) * clampedProgress));
      const g = this.add.graphics();
      g.fillStyle(0x4e3d2a, 0.18);
      g.fillRect(left, top + 2, frameWidth, frameHeight);
      g.fillStyle(0xf4ead2, 1);
      g.fillRect(left, top, frameWidth, frameHeight);
      g.lineStyle(2, 0xb39f80, 1);
      g.strokeRect(left, top, frameWidth, frameHeight);
      g.fillStyle(0xd9c8a7, 1);
      g.fillRect(left + 4, top + 3, frameWidth - 8, frameHeight - 6);
      if (fillWidth > 0) {
        g.fillStyle(0x66b24f, 1);
        g.fillRect(left + 4, top + 3, fillWidth, frameHeight - 6);
        g.fillStyle(0xa4d98b, 1);
        g.fillRect(left + 4, top + 3, fillWidth, 3);
      }
      const segmentWidth = Math.floor((frameWidth - 8) / 10);
      g.lineStyle(1, 0xc6b18c, 0.8);
      for (let i = 1; i < 10; i += 1) {
        const x = left + 4 + segmentWidth * i;
        g.lineBetween(x, top + 3, x, top + frameHeight - 3);
      }
      panel.add(g);
      return;
    }

    const frameWidth = 270;
    const frameHeight = 16;
    const frameRadius = 4;
    const trackInset = 2;
    const trackWidth = frameWidth - trackInset * 2;
    const trackHeight = frameHeight - trackInset * 2;
    const fillWidth = Math.max(0, Math.floor(trackWidth * clampedProgress));
    const trackLeftX = centerX - trackWidth / 2;
    const trackTopY = centerY - trackHeight / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x5f4a33, 0.14);
    shadow.fillRoundedRect(centerX - frameWidth / 2, centerY - frameHeight / 2 + 2, frameWidth, frameHeight, frameRadius);

    const frame = this.add.graphics();
    frame.fillStyle(0xf6edd8, 0.99);
    frame.fillRoundedRect(centerX - frameWidth / 2, centerY - frameHeight / 2, frameWidth, frameHeight, frameRadius);
    frame.lineStyle(2, 0xb8aa8d, 0.98);
    frame.strokeRoundedRect(centerX - frameWidth / 2, centerY - frameHeight / 2, frameWidth, frameHeight, frameRadius);

    const track = this.add.graphics();
    track.fillStyle(0xe1d3b7, 0.98);
    track.fillRoundedRect(trackLeftX, trackTopY, trackWidth, trackHeight, 2);

    const fill = this.add.graphics();
    if (fillWidth > 0) {
      fill.fillStyle(0x7bbf63, 1);
      fill.fillRoundedRect(trackLeftX, trackTopY, fillWidth, trackHeight, 2);
      fill.fillStyle(0xb8e39f, 0.52);
      fill.fillRoundedRect(trackLeftX + 2, trackTopY + 1, Math.max(0, fillWidth - 4), Math.max(2, trackHeight * 0.38), 2);
    }

    const segment = this.add.graphics();
    segment.lineStyle(1, 0xcfbf9f, 0.52);
    const segmentCount = 8;
    for (let i = 1; i < segmentCount; i += 1) {
      const x = trackLeftX + (trackWidth / segmentCount) * i;
      segment.lineBetween(x, trackTopY + 1, x, trackTopY + trackHeight - 1);
    }

    panel.add([shadow, frame, track, fill, segment]);
  }

  private ensureCustomizeSelections(): void {
    const ownedPotIds = this.saveData.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]));
    if (ownedPotIds.length > 0 && !ownedPotIds.includes(this.selectedCustomizePotId)) {
      this.selectedCustomizePotId = ownedPotIds[0];
    }

    const ownedBackgroundIds = this.saveData.collection.ownedBackgroundIds.filter((backgroundId) => Boolean(BACKGROUND_BY_ID[backgroundId]));
    if (ownedBackgroundIds.length > 0 && !ownedBackgroundIds.includes(this.selectedCustomizeBackgroundId)) {
      if (ownedBackgroundIds.includes(this.saveData.garden.backgroundId)) {
        this.selectedCustomizeBackgroundId = this.saveData.garden.backgroundId;
      } else {
        this.selectedCustomizeBackgroundId = ownedBackgroundIds[0];
      }
    }
  }

  private shiftCustomizePot(step: -1 | 1): void {
    const potIds = Array.from(new Set(this.saveData.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]))));
    if (potIds.length <= 1) {
      this.showToast("보유 화분이 1종이라 변경할 수 없습니다.");
      return;
    }
    const currentIndex = Math.max(0, potIds.indexOf(this.selectedCustomizePotId));
    const nextIndex = (currentIndex + step + potIds.length) % potIds.length;
    this.selectedCustomizePotId = potIds[nextIndex];
    this.renderMain();
  }

  private shiftCustomizeBackground(step: -1 | 1): void {
    const backgroundIds = this.saveData.collection.ownedBackgroundIds.filter((backgroundId) => Boolean(BACKGROUND_BY_ID[backgroundId]));
    if (backgroundIds.length <= 1) {
      return;
    }
    const currentIndex = Math.max(0, backgroundIds.indexOf(this.selectedCustomizeBackgroundId));
    const nextIndex = (currentIndex + step + backgroundIds.length) % backgroundIds.length;
    this.selectedCustomizeBackgroundId = backgroundIds[nextIndex];
    this.renderMain();
  }

  private openHomeCustomizeSelection(): void {
    const slot = this.getSelectedSlot() ?? this.saveData.garden.slots[0];
    const ownedPotIds = this.saveData.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]));
    const ownedBackgroundIds = this.saveData.collection.ownedBackgroundIds.filter((backgroundId) => Boolean(BACKGROUND_BY_ID[backgroundId]));

    this.selectedCustomizePotId =
      slot && ownedPotIds.includes(slot.potId)
        ? slot.potId
        : ownedPotIds[0] ?? slot?.potId ?? POT_DEFS[0]?.id ?? "";
    this.selectedCustomizeBackgroundId = ownedBackgroundIds.includes(this.saveData.garden.backgroundId)
      ? this.saveData.garden.backgroundId
      : ownedBackgroundIds[0] ?? this.saveData.garden.backgroundId;

    this.isHomeCustomizeGridOpen = true;
    this.isHomeAttendancePanelOpen = false;
    this.renderMain();
  }

  private commitHomeCustomizeSelection(): void {
    const slotId = this.getSelectedSlot()?.slotId ?? this.saveData.garden.slots[0]?.slotId;
    const selectedPotId = this.selectedCustomizePotId;
    const selectedBackgroundId = this.selectedCustomizeBackgroundId;

    if (!slotId) {
      this.isHomeCustomizeGridOpen = false;
      this.renderMain();
      return;
    }

    this.applyMutation(
      (draft) => {
        const draftSlot = draft.garden.slots.find((candidate) => candidate.slotId === slotId);
        if (!draftSlot) {
          return false;
        }

        let changed = false;
        if (POT_BY_ID[selectedPotId] && draft.collection.ownedPotIds.includes(selectedPotId) && draftSlot.potId !== selectedPotId) {
          draftSlot.potId = selectedPotId;
          changed = true;
        }
        if (
          BACKGROUND_BY_ID[selectedBackgroundId] &&
          draft.collection.ownedBackgroundIds.includes(selectedBackgroundId) &&
          draft.garden.backgroundId !== selectedBackgroundId
        ) {
          draft.garden.backgroundId = selectedBackgroundId;
          changed = true;
        }
        return changed;
      },
      "홈 편집 저장완료",
      "저장할 변경이 없습니다."
    );

    this.isHomeCustomizeGridOpen = false;
    this.renderMain();
  }

  private renderShopPurchaseItems(panel: Phaser.GameObjects.Container): void {
    const totalSeedCount = Math.min(MAX_TOTAL_SEEDS, getTotalSeedCount(this.saveData.inventory.seedCounts));
    const hasSeedCapacity = getSeedCapacity(this.saveData.inventory.seedCounts) > 0;
    const canBuyRandomSeed = hasSeedCapacity && this.saveData.player.coins >= RANDOM_SEED_SHOP_PRICE;
    const seedIconKey = this.textures.exists(SEED_DROP_TEXTURE_KEY) ? SEED_DROP_TEXTURE_KEY : SEED_ICON_TEXTURE_KEY;
    const gemPackIconKey = this.textures.exists(GEM_PACK_TEXTURE_KEY) ? GEM_PACK_TEXTURE_KEY : GEM_ICON_TEXTURE_KEY;
    const contentOffsetY = -3;
    const seedSectionExtraOffsetY = 13;
    const seedBodyExtraOffsetY = 5;
    const shiftY = (y: number): number => y + contentOffsetY;
    const shiftSeedContentY = (y: number): number => y + contentOffsetY + seedSectionExtraOffsetY;
    const shiftSeedRowY = (y: number): number => y + contentOffsetY + seedSectionExtraOffsetY + seedBodyExtraOffsetY;
    const shiftGemY = (y: number): number => y + contentOffsetY - 2;
    const shiftUpgradeY = (y: number): number => y + contentOffsetY - 4;

    panel.add(this.add.rectangle(195, shiftSeedContentY(224.5), 352, 143, 0xfffbef).setStrokeStyle(2, 0xcbc3aa));
    panel.add(
      this.add
        .text(34, shiftSeedContentY(168), "씨앗", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "20px",
          color: "#3d4a3b",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(34, shiftSeedContentY(189) + seedBodyExtraOffsetY, "출석 보상 씨앗과 동일한 랜덤 씨앗을 코인으로 구매할 수 있습니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#646351"
        })
        .setOrigin(0, 0)
    );

    panel.add(this.add.rectangle(195, shiftSeedRowY(243), 334, 56, 0xf9f1df, 0.96).setStrokeStyle(1, 0xd1c2a4));
    this.addContainedImage(panel, seedIconKey, 64, shiftSeedRowY(243), 38, 38);
    panel.add(
      this.add
        .text(94, shiftSeedRowY(225), "씨앗 구매", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "18px",
          color: "#3f4134",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(94, shiftSeedRowY(248), `현재 씨앗 ${totalSeedCount}/${MAX_TOTAL_SEEDS}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#6d6550"
        })
        .setOrigin(0, 0)
    );
    this.addButton(
      panel,
      314,
      shiftSeedRowY(243),
      74,
      32,
      `${RANDOM_SEED_SHOP_PRICE}`,
      () => {
        this.buyRandomSeed();
      },
      {
        enabled: canBuyRandomSeed,
        fillColor: 0x5d8a4e,
        textColor: "#ffffff",
        fontSize: 14
      }
    );
    if (!hasSeedCapacity) {
      panel.add(
        this.add
          .text(314, shiftSeedRowY(266), "씨앗 가득참", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#8a5e40",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
    } else if (!canBuyRandomSeed) {
      panel.add(
        this.add
          .text(314, shiftSeedRowY(266), "코인 부족", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#8a5e40",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
    }

    panel.add(this.add.rectangle(195, shiftUpgradeY(434.5), 352, 211, 0xfffbef).setStrokeStyle(2, 0xcbc3aa));

    panel.add(
      this.add
        .text(34, shiftUpgradeY(342), "강화", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "20px",
          color: "#3d4a3b",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(
          34,
          shiftUpgradeY(371),
          `탭가속 +${this.getTapGrowthBoostSeconds()}초 | 자동 +${this.saveData.clicker.autoCoinsPerSec}/초 | 성장 +${this.saveData.clicker.growthBoostSeconds}초`,
          {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#646351"
          }
        )
        .setOrigin(0, 0)
    );

    const tapCost = getTapUpgradeCost(this.saveData.clicker.tapUpgradeLevel);
    const autoCost = getAutoUpgradeCost(this.saveData.clicker.autoUpgradeLevel);
    const boostCost = getBoostUpgradeCost(this.saveData.clicker.boostUpgradeLevel);
    const tapLevel = Math.min(CLICKER_MAX_UPGRADE_LEVEL, this.saveData.clicker.tapUpgradeLevel);
    const autoLevel = Math.min(CLICKER_MAX_UPGRADE_LEVEL, this.saveData.clicker.autoUpgradeLevel);
    const boostLevel = Math.min(CLICKER_MAX_UPGRADE_LEVEL, this.saveData.clicker.boostUpgradeLevel);
    const tapAtMax = tapLevel >= CLICKER_MAX_UPGRADE_LEVEL;
    const autoAtMax = autoLevel >= CLICKER_MAX_UPGRADE_LEVEL;
    const boostAtMax = boostLevel >= CLICKER_MAX_UPGRADE_LEVEL;

    this.renderUpgradeRow(
      panel,
      shiftUpgradeY(409),
      "탭 파워",
      `Lv.${tapLevel} · 탭가속 +1초`,
      tapCost,
      () => {
        this.upgradeTapPower();
      },
      {
        enabled: !tapAtMax && this.saveData.player.coins >= tapCost,
        buttonLabel: tapAtMax ? "MAX" : `${tapCost}`
      }
    );
    this.renderUpgradeRow(
      panel,
      shiftUpgradeY(459),
      "자동 코인",
      `Lv.${autoLevel} · +1 코인/초`,
      autoCost,
      () => {
        this.upgradeAutoCoins();
      },
      {
        enabled: !autoAtMax && this.saveData.player.coins >= autoCost,
        buttonLabel: autoAtMax ? "MAX" : `${autoCost}`
      }
    );
    this.renderUpgradeRow(
      panel,
      shiftUpgradeY(509),
      "성장 부스트",
      `Lv.${boostLevel} · 탭당 +1초`,
      boostCost,
      () => {
        this.upgradeGrowthBoost();
      },
      {
        enabled: !boostAtMax && this.saveData.player.coins >= boostCost,
        buttonLabel: boostAtMax ? "MAX" : `${boostCost}`
      }
    );

    panel.add(this.add.rectangle(195, shiftGemY(610), 352, 118, 0xfffbef).setStrokeStyle(2, 0xcbc3aa));
    panel.add(
      this.add
        .text(34, shiftGemY(564), "보석", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "20px",
          color: "#3d4a3b",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(34, shiftGemY(586), "보석 팩 1종 실결제 상품을 준비 중입니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#646351"
        })
        .setOrigin(0, 0)
    );
    panel.add(this.add.rectangle(195, shiftGemY(630), 334, 56, 0xf9f1df, 0.96).setStrokeStyle(1, 0xd1c2a4));
    this.addContainedImage(panel, gemPackIconKey, 54, shiftGemY(630), 44, 44);
    panel.add(
      this.add
        .text(76, shiftGemY(616), "보석 팩", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#3f4134",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(76, shiftGemY(634), "보석 +120 · ₩2,500", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: "#6d6550"
        })
        .setOrigin(0, 0)
    );
    this.addButton(
      panel,
      314,
      shiftGemY(630),
      72,
      28,
      "준비중",
      () => {
        this.showToast("보석 실결제는 개발 후반에 연동 예정입니다.");
      },
      {
        fillColor: 0x617e91,
        textColor: "#ffffff",
        fontSize: 12
      }
    );
  }

  private renderUpgradeRow(
    panel: Phaser.GameObjects.Container,
    y: number,
    title: string,
    desc: string,
    cost: number,
    onClick: () => void,
    options?: {
      enabled?: boolean;
      buttonLabel?: string;
    }
  ): void {
    panel.add(this.add.rectangle(195, y, 334, 40, 0xf9f1df, 0.96).setStrokeStyle(1, 0xd1c2a4));
    panel.add(
      this.add
        .text(34, y - 13, title, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#3f4134",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(34, y + 5, desc, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: "#6d6550"
        })
        .setOrigin(0, 0)
    );

    this.addButton(
      panel,
      314,
      y,
      72,
      28,
      options?.buttonLabel ?? `${cost}`,
      () => {
        onClick();
      },
      {
        enabled: options?.enabled ?? this.saveData.player.coins >= cost,
        fillColor: 0x5d8360,
        textColor: "#ffffff",
        fontSize: 13
      }
    );
  }

  private getDecorDisplayGoalSummary(
    pageIndex = this.decorPageIndex,
    previewSpeciesIds?: string[],
    data: SaveDataV1 = this.saveData
  ): DecorDisplayGoalSummary {
    const slots = this.getDecorDisplaySlotsForPage(pageIndex, data);
    const speciesIds =
      previewSpeciesIds ??
      slots
        .map((slot) => slot.speciesId)
        .filter((speciesId): speciesId is string => Boolean(speciesId));
    const categoryCounts: Record<SpeciesGroupCategory, number> = {
      flower: 0,
      foliage: 0,
      succulent: 0
    };
    let filledCount = 0;
    let baseScore = 0;

    speciesIds.forEach((speciesId) => {
      const species = PLANT_BY_ID[speciesId];
      if (!species) {
        return;
      }
      filledCount += 1;
      baseScore += DECOR_DISPLAY_BASE_SCORE_BY_RARITY[species.rarity];
      const category = getSpeciesGroupForSpecies(species.id);
      categoryCounts[category] += 1;
    });

    let themeGoal = DECOR_THEME_GOALS[0];
    let themeCount = categoryCounts[themeGoal.category];
    DECOR_THEME_GOALS.slice(1).forEach((candidate) => {
      const candidateCount = categoryCounts[candidate.category];
      const currentProgress = themeCount / Math.max(1, themeGoal.requiredCount);
      const candidateProgress = candidateCount / Math.max(1, candidate.requiredCount);
      if (candidateProgress > currentProgress) {
        themeGoal = candidate;
        themeCount = candidateCount;
        return;
      }
      if (candidateProgress === currentProgress && candidate.bonusScore > themeGoal.bonusScore) {
        themeGoal = candidate;
        themeCount = candidateCount;
      }
    });

    const setTargetCount = DECOR_DISPLAY_SET_TARGET_COUNT;
    const isSetComplete = filledCount >= setTargetCount;
    const isThemeComplete = themeCount >= themeGoal.requiredCount;
    const setBonusScore = isSetComplete ? DECOR_DISPLAY_SET_BONUS_SCORE : 0;
    const themeBonusScore = isThemeComplete ? themeGoal.bonusScore : 0;
    const activeCategoryCount = Object.values(categoryCounts).filter((count) => count > 0).length;
    const varietyBonusScore = activeCategoryCount >= 3 && filledCount >= 5 ? DECOR_DISPLAY_VARIETY_BONUS_SCORE : 0;
    const totalScore = baseScore + setBonusScore + themeBonusScore + varietyBonusScore;

    return {
      filledCount,
      setTargetCount,
      baseScore,
      setBonusScore,
      themeBonusScore,
      varietyBonusScore,
      totalScore,
      themeGoal,
      themeCount,
      isSetComplete,
      isThemeComplete
    };
  }

  private getDecorScoreRewardStatus(totalScore: number, data: SaveDataV1 = this.saveData): DecorScoreRewardStatus {
    const periodKey = getAttendancePeriodKeyKst(Date.now());
    const savedReward = data.decor.goalReward;
    const claimedTier =
      savedReward?.lastClaimedPeriodKey === periodKey
        ? Phaser.Math.Clamp(Math.floor(savedReward.claimedTier), 0, DECOR_SCORE_REWARD_TIERS.length)
        : 0;
    const unlockedTier = Phaser.Math.Clamp(
      DECOR_SCORE_REWARD_TIERS.filter((tier) => totalScore >= tier.minScore).length,
      0,
      DECOR_SCORE_REWARD_TIERS.length
    );
    const canClaim = unlockedTier > claimedTier;
    const nextTier = canClaim ? DECOR_SCORE_REWARD_TIERS[claimedTier] ?? null : null;
    return {
      periodKey,
      claimedTier,
      unlockedTier,
      canClaim,
      nextTier
    };
  }

  private openDecorGoalModal(): void {
    if (this.activeTab !== "decorate") {
      return;
    }

    this.closeDecorGoalModal();
    this.closeDecorSlotEditModal();

    const modal = this.add.container(0, 0);
    this.decorGoalModal = modal;
    this.modalLayer.add(modal);

    const modalCenterX = 195;
    const modalCenterY = 422;
    const modalWidth = 336;
    const modalHeight = 368;
    const displayGoal = this.getDecorDisplayGoalSummary(this.decorPageIndex);
    const rewardStatus = this.getDecorScoreRewardStatus(displayGoal.totalScore);
    const progressThemeCount = Math.min(displayGoal.themeCount, displayGoal.themeGoal.requiredCount);
    const progressSetText = `세트 ${displayGoal.filledCount}/${displayGoal.setTargetCount}${
      displayGoal.isSetComplete ? ` · 완료 +${displayGoal.setBonusScore}` : ""
    }`;
    const progressThemeText = `테마 ${displayGoal.themeGoal.labelKo} ${progressThemeCount}/${displayGoal.themeGoal.requiredCount}${
      displayGoal.isThemeComplete ? ` · +${displayGoal.themeBonusScore}` : ""
    }`;
    const comboText = displayGoal.varietyBonusScore > 0 ? `조합 보너스 +${displayGoal.varietyBonusScore}` : "조합 보너스 미달성";
    const nextRewardText = rewardStatus.nextTier
      ? `다음 ${rewardStatus.nextTier.minScore}점 · 코인 +${rewardStatus.nextTier.rewardCoins} · 씨앗 +${rewardStatus.nextTier.rewardSeeds}`
      : "오늘 조합 보상을 모두 수령했습니다.";

    const closeModal = (): void => {
      this.closeDecorGoalModal();
    };
    const claimReward = (): void => {
      this.claimDecorScoreRewardForCurrentPage();
      if (this.decorGoalModal) {
        this.openDecorGoalModal();
      }
    };

    const scrim = this.add
      .rectangle(modalCenterX, modalCenterY, 390, 844, 0x1d241f, 0.62)
      .setInteractive({ useHandCursor: true });
    scrim.on("pointerup", () => {
      closeModal();
    });
    modal.add(scrim);

    const bodyTop = modalCenterY - modalHeight / 2;
    modal.add(this.add.rectangle(modalCenterX, modalCenterY, modalWidth, modalHeight, 0xfff8eb, 0.99).setStrokeStyle(2, 0xb79f79, 0.95));
    modal.add(this.add.rectangle(modalCenterX, bodyTop + 10, modalWidth - 30, 6, 0xffffff, 0.22));

    const modalHitBlock = this.add
      .rectangle(modalCenterX, modalCenterY, modalWidth, modalHeight, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    modalHitBlock.on("pointerup", () => {
      // Swallow pointer events inside modal body.
    });
    modal.add(modalHitBlock);

    modal.add(
      this.add
        .text(modalCenterX, bodyTop + 24, "정원 전시 목표", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "24px",
          color: "#3c4034",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    modal.add(
      this.add
        .text(modalCenterX, bodyTop + 56, `${displayGoal.totalScore}점`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "28px",
          color: "#4f6d42",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    modal.add(
      this.add
        .text(modalCenterX, bodyTop + 82, nextRewardText, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: "#6f6857",
          fontStyle: "700",
          align: "center",
          wordWrap: { width: 284 }
        })
        .setOrigin(0.5, 0)
    );
    modal.add(
      this.add
        .text(modalCenterX - 146, bodyTop + 116, `조건 세트 ${displayGoal.setTargetCount}개(+${DECOR_DISPLAY_SET_BONUS_SCORE})`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "10px",
          color: "#6f6857",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    modal.add(
      this.add
        .text(
          modalCenterX - 146,
          bodyTop + 130,
          `조건 테마 ${displayGoal.themeGoal.requiredCount}개(+${displayGoal.themeGoal.bonusScore}) · 다양성(+${DECOR_DISPLAY_VARIETY_BONUS_SCORE})`,
          {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "10px",
            color: "#6f6857",
            fontStyle: "700"
          }
        )
        .setOrigin(0, 0)
    );
    modal.add(
      this.add
        .text(modalCenterX - 146, bodyTop + 147, `${progressSetText} · ${progressThemeText}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "10px",
          color: "#5b6650",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    modal.add(
      this.add
        .text(modalCenterX - 146, bodyTop + 162, comboText, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "10px",
          color: "#5b6650",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    DECOR_SCORE_REWARD_TIERS.forEach((tier, index) => {
      const rowY = bodyTop + 196 + index * 40;
      const isClaimed = index < rewardStatus.claimedTier;
      const isUnlocked = index < rewardStatus.unlockedTier;
      const statusLabel = isClaimed ? "수령완료" : isUnlocked ? "수령가능" : "미달성";
      const statusColor = isClaimed ? "#4b6b49" : isUnlocked ? "#7d5a2d" : "#7a7364";

      modal.add(this.add.rectangle(modalCenterX, rowY, 304, 34, 0xf8f0dd, 0.95).setStrokeStyle(1, 0xd4c4a5, 0.92));
      modal.add(
        this.add
          .text(modalCenterX - 144, rowY - 12, `${index + 1}단계 ${tier.titleKo} · ${tier.minScore}점`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#5d5a4e",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );
      modal.add(
        this.add
          .text(modalCenterX - 144, rowY + 2, `코인 +${tier.rewardCoins} · 랜덤 씨앗 +${tier.rewardSeeds}`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#6b6456"
          })
          .setOrigin(0, 0)
      );
      modal.add(
        this.add
          .text(modalCenterX + 140, rowY, statusLabel, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: statusColor,
            fontStyle: "700"
          })
          .setOrigin(1, 0.5)
      );
    });

    this.addButton(
      modal,
      modalCenterX,
      bodyTop + modalHeight - 24,
      220,
      34,
      rewardStatus.canClaim ? "보상 수령" : "수령 대기",
      claimReward,
      {
        enabled: rewardStatus.canClaim,
        fillColor: 0x6a9052,
        strokeColor: 0x4f6e3e,
        textColor: "#ffffff",
        fontSize: 13
      }
    );
    this.addCollectionCloseButton(modal, modalCenterX + modalWidth / 2 - 28, bodyTop + 22, closeModal);
  }

  private closeDecorGoalModal(): void {
    if (this.decorGoalModal) {
      this.decorGoalModal.destroy(true);
      this.decorGoalModal = null;
    }
  }

  private claimDecorScoreRewardForCurrentPage(): void {
    const pageGoal = this.getDecorDisplayGoalSummary(this.decorPageIndex);
    const rewardStatus = this.getDecorScoreRewardStatus(pageGoal.totalScore);
    if (!rewardStatus.canClaim) {
      this.showToast("수령 가능한 조합 보상이 없습니다.");
      return;
    }

    let grantedCoins = 0;
    let grantedSeeds = 0;
    let claimedFromTier = rewardStatus.claimedTier;
    let claimedToTier = rewardStatus.claimedTier;
    const claimedTierTitles: string[] = [];

    const claimed = this.applyMutation(
      (draft) => {
        const draftGoal = this.getDecorDisplayGoalSummary(this.decorPageIndex, undefined, draft);
        const draftStatus = this.getDecorScoreRewardStatus(draftGoal.totalScore, draft);
        if (!draftStatus.canClaim) {
          return false;
        }

        for (let tierIndex = draftStatus.claimedTier; tierIndex < draftStatus.unlockedTier; tierIndex += 1) {
          const tier = DECOR_SCORE_REWARD_TIERS[tierIndex];
          if (!tier) {
            continue;
          }
          claimedTierTitles.push(tier.titleKo);
          grantedCoins += tier.rewardCoins;
          grantedSeeds += this.grantRandomSeedRewards(draft.inventory.seedCounts, tier.rewardSeeds);
        }

        draft.player.coins = clampCoins(draft.player.coins + grantedCoins);
        if (draft.decor.goalReward.lastClaimedPeriodKey !== draftStatus.periodKey) {
          draft.decor.goalReward.lastClaimedPeriodKey = draftStatus.periodKey;
        }
        draft.decor.goalReward.claimedTier = draftStatus.unlockedTier;
        claimedFromTier = draftStatus.claimedTier;
        claimedToTier = draftStatus.unlockedTier;
        return true;
      },
      undefined,
      "수령 가능한 조합 보상이 없습니다."
    );

    if (!claimed) {
      return;
    }

    const claimedTitle =
      claimedTierTitles.length > 0 ? claimedTierTitles.join(", ") : `${claimedFromTier + 1}단계~${claimedToTier}단계`;
    this.showToast(`전시 보상 수령: ${claimedTitle} (코인 +${grantedCoins}, 씨앗 +${grantedSeeds})`);
  }

  private getCollectionSetCompletionCount(setDef: CollectionSetRewardDef, data: SaveDataV1 = this.saveData): number {
    const discovered = new Set(data.collection.discoveredSpeciesIds);
    return setDef.speciesIds.filter((speciesId) => discovered.has(speciesId)).length;
  }

  private hasClaimedCollectionSetReward(setId: string, data: SaveDataV1 = this.saveData): boolean {
    return data.collection.claimedSetRewardIds.includes(setId);
  }

  private canClaimCollectionSetReward(setDef: CollectionSetRewardDef, data: SaveDataV1 = this.saveData): boolean {
    return (
      setDef.speciesIds.length > 0 &&
      this.getCollectionSetCompletionCount(setDef, data) >= setDef.speciesIds.length &&
      !this.hasClaimedCollectionSetReward(setDef.id, data)
    );
  }

  private hasClaimableCollectionSetReward(data: SaveDataV1 = this.saveData): boolean {
    return COLLECTION_SET_REWARD_DEFS.some((setDef) => this.canClaimCollectionSetReward(setDef, data));
  }

  private claimCollectionSetReward(setId: string): void {
    const setDef = COLLECTION_SET_REWARD_DEFS.find((candidate) => candidate.id === setId);
    if (!setDef) {
      this.showToast("세트 정보를 찾지 못했습니다.");
      return;
    }
    if (this.hasClaimedCollectionSetReward(setDef.id)) {
      this.showToast("이미 수령한 세트 보상입니다.");
      return;
    }
    const completionCount = this.getCollectionSetCompletionCount(setDef);
    if (completionCount < setDef.speciesIds.length) {
      this.showToast("아직 세트가 완성되지 않았습니다.");
      return;
    }

    let grantedSeeds = 0;
    const claimed = this.applyMutation(
      (draft) => {
        if (draft.collection.claimedSetRewardIds.includes(setDef.id)) {
          return false;
        }
        const discovered = new Set(draft.collection.discoveredSpeciesIds);
        const draftCompletionCount = setDef.speciesIds.filter((speciesId) => discovered.has(speciesId)).length;
        if (draftCompletionCount < setDef.speciesIds.length) {
          return false;
        }

        draft.player.coins = clampCoins(draft.player.coins + setDef.rewardCoins);
        grantedSeeds = this.grantRandomSeedRewards(draft.inventory.seedCounts, setDef.rewardSeeds);
        draft.collection.claimedSetRewardIds.push(setDef.id);
        return true;
      },
      undefined,
      "세트 보상을 수령할 수 없습니다."
    );

    if (!claimed) {
      return;
    }

    this.showToast(`세트 보상 수령: ${setDef.titleKo} (코인 +${setDef.rewardCoins}, 씨앗 +${grantedSeeds})`);
  }

  private renderDecoratePanel(): void {
    this.ensureDecorSelections();

    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);
    this.renderGreenhouseDecorateBackground(panel);
    const isPixelStyleMode = false;
    if (this.isDecorClearMode) {
      this.isDecorClearMode = false;
    }
    const isEditMode = this.isDecorEditMode;
    const isClearMode = false;

    panel.add(this.add.rectangle(195, 54, 356, 72, 0xfff8eb, 0.93).setStrokeStyle(2, 0xc8bda3, 0.92));
    const decorHeaderInfoX = TAB_TITLE_X;
    const decorHeaderModeTextY = TAB_SUBTITLE_Y + 5;
    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_TITLE_Y + 5, "정원", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: TAB_TITLE_FONT_SIZE,
          color: "#384638",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    panel.add(
      this.add
        .text(
          decorHeaderInfoX,
          decorHeaderModeTextY,
          "편집 모드: 슬롯을 탭해 꽃/화분을 변경하세요.",
          {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#5f665a",
            fontStyle: "700",
            wordWrap: { width: 328 }
          }
        )
        .setOrigin(0, 0)
    );
    if (isClearMode) {
      panel.add(
        this.add
          .text(decorHeaderInfoX, TAB_SUBTITLE_Y + 22, "회수 가능한 슬롯은 붉은 테두리로 표시됩니다.", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "10px",
            color: "#9a6658",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );
    }

    panel.add(this.add.rectangle(195, 335, 352, 546, 0xfff8eb, 0.56));

    const shelfLabelByLayer: Record<DecorDisplayLayer, string> = {
      back: "A열",
      mid: "B열",
      front: "C열"
    };

    if (isPixelStyleMode) {
      DECOR_DISPLAY_LAYER_ORDER.forEach((layer) => {
        const rowLayouts = DECOR_DISPLAY_SLOT_LAYOUTS.filter((layout) => layout.layer === layer);
        if (rowLayouts.length === 0) {
          return;
        }
        const minX = Math.min(...rowLayouts.map((layout) => layout.x));
        const maxX = Math.max(...rowLayouts.map((layout) => layout.x));
        const shelfCenterX = Math.round((minX + maxX) / 2);
        const shelfWidth = Math.max(190, Math.round(maxX - minX + 126));
        const shelfY = rowLayouts[0].y + 46;

        panel.add(this.add.ellipse(shelfCenterX, shelfY + 6, shelfWidth * 0.88, 12, 0x000000, 0.12));
        panel.add(this.add.rectangle(shelfCenterX, shelfY, shelfWidth, 12, 0xd7be9b, 0.97).setStrokeStyle(1.5, 0xb08e67, 0.92));
        panel.add(this.add.rectangle(shelfCenterX, shelfY - 3, shelfWidth - 16, 3, 0xf2dfc6, 0.7));
        panel.add(
          this.add
            .text(Math.max(30, minX - 44), shelfY - 12, shelfLabelByLayer[layer], {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "13px",
              color: "#7c7059",
              fontStyle: "700"
            })
            .setOrigin(0, 0.5)
        );
      });
    } else {
      const decorRowBgWidth = 346;
      const decorRowBgHeight = 170;
      const decorRowGapCompensationPerLayer = 33;
      const decorDisplayGlobalOffsetY = -10;
      DECOR_DISPLAY_LAYER_ORDER.forEach((layer, layerIndex) => {
        const rowLayouts = DECOR_DISPLAY_SLOT_LAYOUTS.filter((layout) => layout.layer === layer);
        if (rowLayouts.length === 0) {
          return;
        }
        const rowCenterX = 195;
        const rowWidth = decorRowBgWidth;
        const rowHeight = decorRowBgHeight;
        const rowCenterY = rowLayouts[0].y - 19 + layerIndex * decorRowGapCompensationPerLayer + decorDisplayGlobalOffsetY;
        const rowLeft = rowCenterX - rowWidth / 2;
        const rowTop = rowCenterY - rowHeight / 2;
        panel.add(this.add.rectangle(rowCenterX, rowCenterY, rowWidth, rowHeight, 0xfff8eb, 0.84).setStrokeStyle(2, 0xd3c5a7, 0.92));
        panel.add(
          this.add
            .text(rowLeft + 12, rowTop + 16, shelfLabelByLayer[layer], {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "13px",
              color: "#7c7059",
              fontStyle: "700"
            })
            .setOrigin(0, 0.5)
        );
      });
    }

    const activeSlots = this.getActiveDecorDisplaySlots();
    const slotById = new Map(activeSlots.map((slot) => [slot.slotId, slot]));
    const fallbackPotId = this.saveData.collection.ownedPotIds[0] ?? POT_DEFS[0]?.id ?? "pot_clay";
    const decorDisplayGlobalOffsetY = -10;

    DECOR_DISPLAY_SLOT_LAYOUTS.forEach((layout) => {
      const slotContentOffsetY = layout.layer === "back" ? -10 : layout.layer === "mid" ? 15 : 50;
      const renderLayout = { ...layout, y: layout.y + slotContentOffsetY + decorDisplayGlobalOffsetY };
      const slotState: DecorDisplaySlotState =
        slotById.get(layout.slotId) ?? {
          slotId: layout.slotId,
          layer: layout.layer,
          page: this.decorPageIndex,
          potId: fallbackPotId,
          speciesId: null
        };

      const isSelectedSlot = !isClearMode && isEditMode && this.selectedDecorSlotId === layout.slotId;
      try {
        const displaySpeciesId = slotState.speciesId;
        if (displaySpeciesId) {
          this.renderDecorDisplayPlacedFlower(
            panel,
            renderLayout,
            {
              ...slotState,
              speciesId: displaySpeciesId,
              potId: slotState.potId && POT_BY_ID[slotState.potId] ? slotState.potId : fallbackPotId
            },
            isSelectedSlot
          );
        } else {
          this.renderDecorEmptyDisplaySlot(
            panel,
            renderLayout,
            isPixelStyleMode,
            isEditMode,
            isClearMode,
            this.canPlaceSelectedFlowerToDecorDisplaySlot(layout.slotId)
          );
        }
      } catch (error) {
        console.warn("[decorate] slot render failed", layout.slotId, error);
          this.renderDecorEmptyDisplaySlot(
            panel,
            renderLayout,
            isPixelStyleMode,
            isEditMode,
            isClearMode,
            this.canPlaceSelectedFlowerToDecorDisplaySlot(layout.slotId)
          );
      }

      const hasPlacedPlant = Boolean(slotState.speciesId);
      if (isClearMode) {
        panel.add(
          this.add
            .rectangle(
              renderLayout.x,
              renderLayout.y + 10,
              104,
              118,
              hasPlacedPlant ? 0xc97f70 : 0xf1ead9,
              hasPlacedPlant ? 0.14 : 0.06
            )
            .setStrokeStyle(hasPlacedPlant ? 2.4 : 1.2, hasPlacedPlant ? 0x9b5b4e : 0xc8bba0, hasPlacedPlant ? 0.96 : 0.7)
        );
        if (hasPlacedPlant) {
          panel.add(
            this.add
              .rectangle(renderLayout.x + 34, renderLayout.y - 44, 44, 18, 0xa46053, 0.95)
              .setStrokeStyle(1.2, 0x7f4d42, 0.92)
          );
          panel.add(
            this.add
              .text(renderLayout.x + 34, renderLayout.y - 44, "비우기", {
                fontFamily: "Pretendard, sans-serif",
                fontSize: "10px",
                color: "#fff7ef",
                fontStyle: "700"
              })
              .setOrigin(0.5)
          );
        }
      }

      if (isSelectedSlot) {
        panel.add(this.add.ellipse(renderLayout.x, renderLayout.y + 12, 114, 126, 0x6d9b5f, 0.1));
        panel.add(
          this.add
            .rectangle(renderLayout.x, renderLayout.y + 10, 104, 118, 0x6d9b5f, 0.14)
            .setStrokeStyle(3, 0x4f7b45, 0.98)
        );
        panel.add(this.add.circle(renderLayout.x - 46, renderLayout.y - 44, 3, 0x4f7b45, 0.98));
        panel.add(this.add.circle(renderLayout.x + 46, renderLayout.y - 44, 3, 0x4f7b45, 0.98));
        panel.add(this.add.circle(renderLayout.x - 46, renderLayout.y + 64, 3, 0x4f7b45, 0.98));
        panel.add(this.add.circle(renderLayout.x + 46, renderLayout.y + 64, 3, 0x4f7b45, 0.98));
      }

      const slotHitArea = this.add
        .rectangle(renderLayout.x, renderLayout.y + 12, 120, 150, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      slotHitArea.on("pointerup", () => {
        if (this.isDecorClearMode) {
          this.closeDecorSlotEditModal();
          this.selectedDecorSlotId = null;
          this.retrieveDecorDisplaySlot(layout.slotId);
          return;
        }
        if (!this.isDecorEditMode) {
          this.isDecorEditMode = true;
        }
        this.selectedDecorSlotId = layout.slotId;
        this.syncDecorSelectionWithSlot(layout.slotId);
        this.openDecorSlotEditModal(layout.slotId);
      });
      panel.add(slotHitArea);
    });

    const totalPage = DECOR_DISPLAY_PAGE_COUNT;
    this.addButton(
      panel,
      112,
      SHOP_FOOTER_Y,
      88,
      34,
      "이전",
      () => {
        this.shiftDecorPage(-1);
      },
      {
        enabled: this.decorPageIndex > 0,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );

    panel.add(
      this.add
        .text(195, SHOP_FOOTER_Y, `${this.decorPageIndex + 1} / ${totalPage}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#5e6a5c"
        })
        .setOrigin(0.5)
    );

    this.addButton(
      panel,
      278,
      SHOP_FOOTER_Y,
      88,
      34,
      "다음",
      () => {
        this.shiftDecorPage(1);
      },
      {
        enabled: this.decorPageIndex < totalPage - 1,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );
  }

  private toggleDecorClearMode(): void {
    this.isDecorClearMode = !this.isDecorClearMode;
    this.isDecorEditMode = false;
    this.selectedDecorSlotId = null;
    this.closeDecorSlotEditModal();
    this.showToast(this.isDecorClearMode ? "비우기 ON" : "비우기 OFF");
    this.renderMain();
  }

  private syncDecorSelectionWithSlot(slotId: string): void {
    const slotState = this.getDecorDisplaySlotState(slotId);
    if (!slotState) {
      return;
    }

    if (slotState.speciesId && PLANT_BY_ID[slotState.speciesId]) {
      this.selectedDecorFlowerId = slotState.speciesId;
    } else {
      const editableFlowerIds = this.getDecorEditableFlowerIds(slotId);
      if (editableFlowerIds.length > 0 && !editableFlowerIds.includes(this.selectedDecorFlowerId)) {
        this.selectedDecorFlowerId = editableFlowerIds[0];
      }
    }
    if (slotState.potId && POT_BY_ID[slotState.potId]) {
      this.selectedDecorPotId = slotState.potId;
    }
  }

  private openDecorSlotEditModal(slotId: string, options?: { preserveSelection?: boolean }): void {
    if (this.activeTab !== "decorate" || this.isDecorClearMode) {
      return;
    }
    if (!this.isDecorEditMode) {
      this.isDecorEditMode = true;
    }

    const slotLayout = DECOR_DISPLAY_SLOT_LAYOUT_BY_ID[slotId];
    if (!slotLayout) {
      return;
    }

    if (this.isOpeningDecorSlotEditModal) {
      return;
    }
    this.isOpeningDecorSlotEditModal = true;
    let modal: Phaser.GameObjects.Container | null = null;
    const modalCenterX = 195;
    const modalCenterY = 422;
    const modalWidth = 310;
    const modalHeight = 436;
    const bodyTop = modalCenterY - modalHeight / 2;
    const previewCenterY = bodyTop + 167;
    const editControlsOffsetY = 20;
    const flowerCategoryFilterY = bodyTop + 250 + editControlsOffsetY;
    const flowerSelectorY = bodyTop + 286 + editControlsOffsetY;
    const potSelectorY = bodyTop + 330 + editControlsOffsetY;
    const saveButtonY = bodyTop + 388 + editControlsOffsetY;
    const selectorArrowOffsetX = 86;
    const selectorValueBoxWidth = 104;
    const selectorValueBoxHeight = 28;
    const closeModal = (): void => {
      this.closeDecorSlotEditModal();
    };
    try {
      this.closeDecorSlotEditModal();
      this.selectedDecorSlotId = slotId;

      const preserveSelection = options?.preserveSelection ?? false;
      if (!preserveSelection) {
        this.syncDecorSelectionWithSlot(slotId);
      } else {
        const editableForPreserve = this.getDecorEditableFlowerIds(slotId);
        if (editableForPreserve.length > 0 && !editableForPreserve.includes(this.selectedDecorFlowerId)) {
          this.selectedDecorFlowerId = editableForPreserve[0];
        }
        const ownedPotsForPreserve = this.getOwnedDecorPotIds();
        if (ownedPotsForPreserve.length > 0 && !ownedPotsForPreserve.includes(this.selectedDecorPotId)) {
          this.selectedDecorPotId = ownedPotsForPreserve[0];
        }
      }

      const allEditableFlowerIds = this.getDecorEditableFlowerIds(slotId);
      const flowerCategoryCounts: Record<SpeciesGroupCategory, number> = {
        flower: 0,
        foliage: 0,
        succulent: 0
      };
      allEditableFlowerIds.forEach((speciesId) => {
        const category = getSpeciesGroupForSpecies(speciesId);
        flowerCategoryCounts[category] += 1;
      });
      if (!preserveSelection && this.selectedDecorFlowerId) {
        this.decorEditFlowerCategoryFilter = getSpeciesGroupForSpecies(this.selectedDecorFlowerId);
      }
      if (flowerCategoryCounts[this.decorEditFlowerCategoryFilter] <= 0) {
        const fallbackCategory = (["flower", "foliage", "succulent"] as const).find(
          (category) => flowerCategoryCounts[category] > 0
        );
        if (fallbackCategory) {
          this.decorEditFlowerCategoryFilter = fallbackCategory;
        }
      }
      const editableFlowerIds = this.getDecorEditableFlowerIdsByCategory(this.decorEditFlowerCategoryFilter, slotId);
      if (editableFlowerIds.length > 0 && !editableFlowerIds.includes(this.selectedDecorFlowerId)) {
        this.selectedDecorFlowerId = editableFlowerIds[0];
      }
      const ownedPotIds = this.getOwnedDecorPotIds();
      const canShiftFlower = editableFlowerIds.length > 1;
      const canShiftPot = ownedPotIds.length > 1;
      const selectedFlower =
        this.selectedDecorFlowerId && AVAILABLE_PLANT_SPECIES_ID_SET.has(this.selectedDecorFlowerId)
          ? PLANT_BY_ID[this.selectedDecorFlowerId]
          : null;
      const selectedFlowerName = truncateLabel(selectedFlower?.nameKo ?? "선택 없음", 12);
      const selectedPotName = truncateLabel(POT_BY_ID[this.selectedDecorPotId]?.nameKo ?? "선택 없음", 12);

      modal = this.add.container(0, 0);
      this.decorSlotEditModal = modal;
      this.modalLayer.add(modal);

      const scrim = this.add
        .rectangle(modalCenterX, modalCenterY, 390, 844, 0x1e2620, 0.48)
        .setInteractive({ useHandCursor: true });
      scrim.on("pointerup", () => {
        // Keep modal open on outside tap to avoid accidental close right after slot tap.
      });
      modal.add(scrim);

      modal.add(
        this.add
          .rectangle(modalCenterX, modalCenterY, modalWidth, modalHeight, 0xfff8eb, 0.995)
          .setStrokeStyle(2, 0xb79f79, 0.95)
      );
      modal.add(this.add.rectangle(modalCenterX, bodyTop + 10, modalWidth - 28, 6, 0xffffff, 0.22));
      const modalHitBlock = this.add
        .rectangle(modalCenterX, modalCenterY, modalWidth, modalHeight, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      modalHitBlock.on("pointerup", () => {
        // Swallow pointer events inside modal body.
      });
      modal.add(modalHitBlock);

      modal.add(
        this.add
          .text(modalCenterX - 132, bodyTop + 24, `슬롯 ${slotLayout.labelKo} 편집`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "20px",
            color: "#3c4034",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );
      modal.add(
        this.add
          .text(modalCenterX - 132, bodyTop + 52, `선택: ${selectedFlowerName} + ${selectedPotName}`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#66715f",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );

      this.addCollectionCloseButton(modal, modalCenterX + modalWidth / 2 - 24, bodyTop + 22, closeModal);

      let hasPreviewRenderError = false;
      try {
        this.renderDecorEditSelectionPreview(modal, modalCenterX, previewCenterY, selectedFlower?.id ?? null, this.selectedDecorPotId);
      } catch (error) {
        hasPreviewRenderError = true;
        console.warn("[decorate] slot edit preview render failed", slotId, error);
        modal.add(this.add.rectangle(modalCenterX, previewCenterY, 236, 156, 0xf9f4e6, 0.96).setStrokeStyle(1.5, 0xd6c8aa, 0.94));
      }

      modal.add(
        this.add
          .text(modalCenterX - 142, flowerCategoryFilterY, "분류", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#66715f",
            fontStyle: "700"
          })
          .setOrigin(0, 0.5)
      );
      const categoryButtons: ReadonlyArray<{ category: SpeciesGroupCategory; label: string; x: number }> = [
        { category: "flower", label: "꽃", x: modalCenterX - 72 },
        { category: "foliage", label: "관엽", x: modalCenterX },
        { category: "succulent", label: "다육", x: modalCenterX + 72 }
      ];
      categoryButtons.forEach(({ category, label, x }) => {
        const isActiveCategory = this.decorEditFlowerCategoryFilter === category;
        const isCategoryAvailable = flowerCategoryCounts[category] > 0;
        this.addButton(
          modal!,
          x,
          flowerCategoryFilterY,
          62,
          26,
          label,
          () => {
            if (!isCategoryAvailable) {
              this.showToast("해당 분류에 변경 가능한 식물이 없습니다.");
              return;
            }
            if (this.decorEditFlowerCategoryFilter === category) {
              return;
            }
            this.decorEditFlowerCategoryFilter = category;
            const filteredIds = this.getDecorEditableFlowerIdsByCategory(category, slotId);
            if (filteredIds.length > 0 && !filteredIds.includes(this.selectedDecorFlowerId)) {
              this.selectedDecorFlowerId = filteredIds[0];
            }
            this.refreshDecorSlotEditModalIfOpen(slotId);
          },
          {
            enabled: true,
            fillColor: isActiveCategory ? 0x6d9b5f : isCategoryAvailable ? 0xe8dfc8 : 0xa5aaa0,
            strokeColor: isActiveCategory ? 0x406431 : isCategoryAvailable ? 0x9b8f76 : 0x7b8078,
            textColor: isActiveCategory ? "#ffffff" : isCategoryAvailable ? "#5a594f" : "#eceeea",
            fontSize: 12,
            hitPadding: 4
          }
        );
      });

      modal.add(
        this.add
          .text(modalCenterX - 142, flowerSelectorY, "식물", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#66715f",
            fontStyle: "700"
          })
          .setOrigin(0, 0.5)
      );
      modal.add(
        this.add
          .rectangle(modalCenterX, flowerSelectorY, selectorValueBoxWidth, selectorValueBoxHeight, 0xf8f3e6, 0.98)
          .setStrokeStyle(1.5, 0xd1c3a7, 0.94)
      );
      this.addButton(
        modal,
        modalCenterX - selectorArrowOffsetX,
        flowerSelectorY,
        44,
        34,
        "◀",
        () => {
          if (!canShiftFlower) {
            this.showToast("변경 가능한 식물이 없습니다.");
            return;
          }
          this.shiftDecorFlower(-1);
        },
        {
          enabled: true,
          fillColor: canShiftFlower ? 0x6f8465 : 0xa5aaa0,
          strokeColor: canShiftFlower ? 0x48624a : 0x7b8078,
          textColor: canShiftFlower ? "#ffffff" : "#eceeea",
          fontSize: 12,
          hitPadding: 6,
          triggerOnPointerDown: true
        }
      );
      modal.add(
        this.add
          .text(modalCenterX, flowerSelectorY, selectedFlowerName, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "13px",
            color: "#4d5248",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      this.addButton(
        modal,
        modalCenterX + selectorArrowOffsetX,
        flowerSelectorY,
        44,
        34,
        "▶",
        () => {
          if (!canShiftFlower) {
            this.showToast("변경 가능한 식물이 없습니다.");
            return;
          }
          this.shiftDecorFlower(1);
        },
        {
          enabled: true,
          fillColor: canShiftFlower ? 0x6f8465 : 0xa5aaa0,
          strokeColor: canShiftFlower ? 0x48624a : 0x7b8078,
          textColor: canShiftFlower ? "#ffffff" : "#eceeea",
          fontSize: 12,
          hitPadding: 6,
          triggerOnPointerDown: true
        }
      );

      modal.add(
        this.add
          .text(modalCenterX - 142, potSelectorY, "화분", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#66715f",
            fontStyle: "700"
          })
          .setOrigin(0, 0.5)
      );
      modal.add(
        this.add
          .rectangle(modalCenterX, potSelectorY, selectorValueBoxWidth, selectorValueBoxHeight, 0xf8f3e6, 0.98)
          .setStrokeStyle(1.5, 0xd1c3a7, 0.94)
      );
      this.addButton(
        modal,
        modalCenterX - selectorArrowOffsetX,
        potSelectorY,
        44,
        34,
        "◀",
        () => {
          if (!canShiftPot) {
            this.showToast("보유 화분이 1종이라 변경할 수 없습니다.");
            return;
          }
          this.shiftDecorPot(-1);
        },
        {
          enabled: true,
          fillColor: canShiftPot ? 0x6f8465 : 0xa5aaa0,
          strokeColor: canShiftPot ? 0x48624a : 0x7b8078,
          textColor: canShiftPot ? "#ffffff" : "#eceeea",
          fontSize: 12,
          hitPadding: 6,
          triggerOnPointerDown: true
        }
      );
      modal.add(
        this.add
          .text(modalCenterX, potSelectorY, selectedPotName, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "13px",
            color: "#4d5248",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      this.addButton(
        modal,
        modalCenterX + selectorArrowOffsetX,
        potSelectorY,
        44,
        34,
        "▶",
        () => {
          if (!canShiftPot) {
            this.showToast("보유 화분이 1종이라 변경할 수 없습니다.");
            return;
          }
          this.shiftDecorPot(1);
        },
        {
          enabled: true,
          fillColor: canShiftPot ? 0x6f8465 : 0xa5aaa0,
          strokeColor: canShiftPot ? 0x48624a : 0x7b8078,
          textColor: canShiftPot ? "#ffffff" : "#eceeea",
          fontSize: 12,
          hitPadding: 6,
          triggerOnPointerDown: true
        }
      );

      const saveCheck = this.getDecorSlotSaveCheck(slotId);
      const saveCurrentSlot = (): boolean => this.placeSelectedFlowerToDecorDisplaySlot(slotId);
      const slotStateForClear = this.getDecorDisplaySlotState(slotId);
      const canClearSlot = Boolean(slotStateForClear?.speciesId);
      const clearCurrentSlot = (): void => {
        if (!canClearSlot) {
          this.showToast("이미 빈 슬롯");
          return;
        }
        this.retrieveDecorDisplaySlot(slotId);
        this.isDecorEditMode = false;
        this.selectedDecorSlotId = null;
        closeModal();
        this.renderMain();
      };

      const actionButtonWidth = 114;
      const actionButtonGap = 14;
      const clearButtonX = modalCenterX - (actionButtonWidth / 2 + actionButtonGap / 2);
      const saveButtonX = modalCenterX + (actionButtonWidth / 2 + actionButtonGap / 2);

      this.addButton(
        modal,
        clearButtonX,
        saveButtonY,
        actionButtonWidth,
        36,
        "비우기",
        () => {
          clearCurrentSlot();
        },
        {
          enabled: canClearSlot,
          fillColor: 0xa46e5f,
          strokeColor: 0x7d4d40,
          textColor: "#ffffff",
          fontSize: 12,
          hitPadding: 4
        }
      );

      this.addButton(
        modal,
        saveButtonX,
        saveButtonY,
        actionButtonWidth,
        36,
        "저장",
        () => {
          const applied = saveCurrentSlot();
          if (applied) {
            this.isDecorEditMode = false;
            this.selectedDecorSlotId = null;
            closeModal();
            this.renderMain();
          }
        },
        {
          enabled: saveCheck.canSave,
          fillColor: 0x6d9b5f,
          strokeColor: 0x406431,
          textColor: "#ffffff",
          fontSize: 12,
          hitPadding: 4
        }
      );
      if (!canShiftFlower) {
        modal.add(
          this.add
            .text(modalCenterX, flowerSelectorY + 26, "현재 변경 가능한 식물이 없습니다.", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: "#8a7164",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }
      if (!canShiftPot) {
        modal.add(
          this.add
            .text(modalCenterX, potSelectorY + 26, "보유 화분이 1종이라 변경할 수 없습니다.", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: "#8a7164",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }
      if (hasPreviewRenderError) {
        modal.add(
          this.add
            .text(modalCenterX, bodyTop + 258, "미리보기 로드 실패", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: "#8a7164",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }
    } catch (error) {
      console.warn("[decorate] slot edit modal render failed", slotId, error);
      if (!modal) {
        modal = this.add.container(0, 0);
        this.decorSlotEditModal = modal;
        this.modalLayer.add(modal);
      }
      modal.add(
        this.add
          .text(modalCenterX, bodyTop + 158, "편집 UI를 불러오는 중 오류가 발생했습니다.", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#7a5f52",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      modal.add(
        this.add
          .text(modalCenterX, bodyTop + 176, "잠시 후 다시 시도해 주세요.", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#8a7164",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      this.addButton(
        modal,
        modalCenterX,
        bodyTop + 336,
        108,
        34,
        "닫기",
        () => {
          closeModal();
        },
        {
          fillColor: 0xe6dec5,
          strokeColor: 0xab9e80,
          textColor: "#4d4a3f",
          fontSize: 12
        }
      );
    } finally {
      this.isOpeningDecorSlotEditModal = false;
    }
  }

  private refreshDecorSlotEditModalIfOpen(slotId: string | null = this.selectedDecorSlotId): void {
    if (!this.decorSlotEditModal) {
      return;
    }
    if (!slotId || this.activeTab !== "decorate" || !this.isDecorEditMode) {
      this.closeDecorSlotEditModal();
      return;
    }
    this.openDecorSlotEditModal(slotId, { preserveSelection: true });
  }

  private closeDecorSlotEditModal(): void {
    if (this.decorSlotEditModal) {
      this.decorSlotEditModal.destroy(true);
      this.decorSlotEditModal = null;
    }
  }

  private canPlaceSelectedFlowerToDecorDisplaySlot(slotId: string, data: SaveDataV1 = this.saveData): boolean {
    const speciesId = this.selectedDecorFlowerId;
    const selectedPotId = this.selectedDecorPotId;
    if (!speciesId || !PLANT_BY_ID[speciesId]) {
      return false;
    }
    if (!selectedPotId || !POT_BY_ID[selectedPotId]) {
      return false;
    }

    const slot = data.decor.displaySlots.find(
      (candidate) => candidate.page === this.decorPageIndex && candidate.slotId === slotId
    );
    if (slot?.speciesId) {
      return false;
    }
    if (!data.collection.discoveredSpeciesIds.includes(speciesId)) {
      return false;
    }
    if (!data.collection.ownedPotIds.includes(selectedPotId)) {
      return false;
    }
    const duplicateSlot = data.decor.displaySlots.some(
      (candidate) => candidate.speciesId === speciesId && !(candidate.page === this.decorPageIndex && candidate.slotId === slotId)
    );
    if (duplicateSlot) {
      return false;
    }

    const stock = Math.min(1, Math.max(0, Math.floor(data.decor.displayFlowerCounts[speciesId] ?? 0)));
    return stock > 0;
  }

  private getDecorSlotSaveCheck(
    slotId: string,
    data: SaveDataV1 = this.saveData
  ): {
    canSave: boolean;
    reason: string;
  } {
    const speciesId = this.selectedDecorFlowerId;
    const selectedPotId = this.selectedDecorPotId;
    if (!speciesId || !PLANT_BY_ID[speciesId]) {
      return { canSave: false, reason: "식물 선택 필요" };
    }
    if (!selectedPotId || !POT_BY_ID[selectedPotId]) {
      return { canSave: false, reason: "화분 선택 필요" };
    }

    const targetPage = this.decorPageIndex;
    const targetSlot = data.decor.displaySlots.find(
      (candidate) => candidate.page === targetPage && candidate.slotId === slotId
    );
    if (!targetSlot && !DECOR_DISPLAY_SLOT_LAYOUT_BY_ID[slotId]) {
      return { canSave: false, reason: "슬롯 오류" };
    }

    const previousSpeciesId = targetSlot?.speciesId ?? null;
    const previousPotId = targetSlot?.potId ?? null;
    const isSpeciesChanged = previousSpeciesId !== speciesId;
    const isPotChanged = previousPotId !== selectedPotId;
    if (!isSpeciesChanged && !isPotChanged) {
      return { canSave: false, reason: "변경 없음" };
    }

    if (!data.collection.discoveredSpeciesIds.includes(speciesId)) {
      return { canSave: false, reason: "미발견 식물" };
    }
    if (!data.collection.ownedPotIds.includes(selectedPotId)) {
      return { canSave: false, reason: "미보유 화분" };
    }

    const duplicateSlot = data.decor.displaySlots.find(
      (candidate) => candidate.speciesId === speciesId && !(candidate.page === targetPage && candidate.slotId === slotId)
    );
    if (duplicateSlot) {
      return { canSave: false, reason: "같은 식물 중복 불가" };
    }

    if (isSpeciesChanged) {
      const currentStock = Math.min(1, Math.max(0, Math.floor(data.decor.displayFlowerCounts[speciesId] ?? 0)));
      if (currentStock <= 0) {
        return { canSave: false, reason: "배치 가능한 식물 없음" };
      }
    }

    return { canSave: true, reason: "" };
  }

  private renderDecorEditSelectionPreview(
    panel: Phaser.GameObjects.Container,
    centerX: number,
    centerY: number,
    selectedFlowerId: string | null,
    _selectedPotId: string
  ): void {
    panel.add(this.add.rectangle(centerX, centerY, 236, 156, 0xf9f4e6, 0.96).setStrokeStyle(1.5, 0xd6c8aa, 0.94));
    panel.add(this.add.rectangle(centerX, centerY - 74, 220, 4, 0xffffff, 0.34));

    const preview = this.add.container(centerX, centerY + 20);
    panel.add(preview);

    const previewPotId = POT_BY_ID.pot_clay ? "pot_clay" : POT_DEFS[0]?.id ?? "pot_clay";
    const renderedPot = this.addPotPreviewImage(preview, previewPotId, 0, 24, 66, 66);
    if (!renderedPot) {
      preview.add(this.add.ellipse(0, 26, 60, 24, 0xb97849, 1).setStrokeStyle(2, 0x8f5a36));
      preview.add(this.add.ellipse(0, 19, 64, 10, 0x8f5a36, 0.72));
    }

    const species = selectedFlowerId ? PLANT_BY_ID[selectedFlowerId] : null;
    if (!species || !selectedFlowerId) {
      preview.add(
        this.add
          .text(0, 2, "식물 선택", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#8a846f",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      preview.setScale(1);
      return;
    }

    const selectedSpeciesGroup = getSpeciesGroupForSpecies(selectedFlowerId);
    const previewPlantYOffset = 2 + (selectedSpeciesGroup === "foliage" ? 3 : selectedSpeciesGroup === "flower" ? -3 : 0);
    {
      const collectionCutoutTextureKey = getCollectionFlowerCutoutTextureKey(selectedFlowerId);
      const collectionSourceTextureKey = getCollectionFlowerTextureKey(selectedFlowerId);
      if (this.textures.exists(collectionCutoutTextureKey)) {
        this.addContainedImage(preview, collectionCutoutTextureKey, 0, -30 + previewPlantYOffset, 92, 92);
      } else if (this.textures.exists(collectionSourceTextureKey)) {
        this.addContainedImage(preview, collectionSourceTextureKey, 0, -30 + previewPlantYOffset, 92, 92);
      } else {
        const stemColor = hexToNumber(species.stemColorHex, 0x5b8f53);
        const bloomColor = hexToNumber(species.bloomColorHex, 0xe48b94);
        preview.add(this.add.rectangle(0, -14 + previewPlantYOffset, 5, 40, stemColor));
        preview.add(this.add.circle(0, -38 + previewPlantYOffset, 16, bloomColor));
        preview.add(this.add.circle(-11, -36 + previewPlantYOffset, 9, bloomColor, 0.9));
        preview.add(this.add.circle(11, -36 + previewPlantYOffset, 9, bloomColor, 0.9));
      }
    }

    preview.setScale(1.08);
  }

  private getDecorDisplayFlowerCount(speciesId: string): number {
    return Math.min(1, Math.max(0, Math.floor(this.saveData.decor.displayFlowerCounts[speciesId] ?? 0)));
  }

  private findFirstEmptyDecorDisplaySlot(data: SaveDataV1 = this.saveData): DecorDisplaySlotState | null {
    for (let pageIndex = 0; pageIndex < DECOR_DISPLAY_PAGE_COUNT; pageIndex += 1) {
      for (const layout of DECOR_DISPLAY_SLOT_LAYOUT) {
        const slot = data.decor.displaySlots.find(
          (candidate) => candidate.page === pageIndex && candidate.slotId === layout.slotId
        );
        if (slot && !slot.speciesId) {
          return slot;
        }
      }
    }
    return null;
  }

  private autoPlaceSpeciesIntoDecorDisplay(data: SaveDataV1, speciesId: string): boolean {
    if (!PLANT_BY_ID[speciesId]) {
      return false;
    }
    if (data.decor.displaySlots.some((slot) => slot.speciesId === speciesId)) {
      data.decor.displayFlowerCounts[speciesId] = 0;
      return false;
    }
    const stock = Math.min(1, Math.max(0, Math.floor(data.decor.displayFlowerCounts[speciesId] ?? 0)));
    if (stock <= 0) {
      return false;
    }
    const targetSlot = this.findFirstEmptyDecorDisplaySlot(data);
    if (!targetSlot) {
      return false;
    }
    const fallbackPotId = POT_DEFS[0]?.id ?? "pot_clay";
    const preferredPotId =
      data.garden.slots[0]?.potId ?? data.collection.ownedPotIds[0] ?? this.selectedDecorPotId ?? fallbackPotId;
    const potId = data.collection.ownedPotIds.includes(preferredPotId)
      ? preferredPotId
      : data.collection.ownedPotIds[0] ?? fallbackPotId;
    targetSlot.speciesId = speciesId;
    targetSlot.potId = potId;
    data.decor.displayFlowerCounts[speciesId] = 0;
    return true;
  }

  private autoFillDecorDisplayFromAcquiredOrder(data: SaveDataV1): void {
    const discoveredSet = new Set(data.collection.discoveredSpeciesIds);
    const orderedSpeciesIds: string[] = [
      ...CARTOON_PRIORITY_SPECIES_IDS.filter((speciesId) => discoveredSet.has(speciesId)),
      ...data.collection.discoveredSpeciesIds.filter((speciesId) => !CARTOON_PRIORITY_SPECIES_ID_SET.has(speciesId))
    ];
    for (const speciesId of orderedSpeciesIds) {
      this.autoPlaceSpeciesIntoDecorDisplay(data, speciesId);
    }
  }

  private getDecorPlantDisplayName(speciesId: string): string {
    const nickname = (this.saveData.collection.plantNicknames[speciesId] ?? "").trim();
    if (nickname.length > 0) {
      return nickname;
    }
    return PLANT_BY_ID[speciesId]?.nameKo ?? "식물";
  }

  private getDecorDisplaySlotsForPage(pageIndex: number, data: SaveDataV1 = this.saveData): DecorDisplaySlotState[] {
    return data.decor.displaySlots.filter((slot) => slot.page === pageIndex);
  }

  private getActiveDecorDisplaySlots(data: SaveDataV1 = this.saveData): DecorDisplaySlotState[] {
    return this.getDecorDisplaySlotsForPage(this.decorPageIndex, data);
  }

  private getDecorDisplaySlotState(slotId: string): DecorDisplaySlotState | null {
    return this.getActiveDecorDisplaySlots().find((slot) => slot.slotId === slotId) ?? null;
  }

  private isSpeciesPlacedInDecorDisplay(speciesId: string, data: SaveDataV1 = this.saveData): boolean {
    return data.decor.displaySlots.some((slot) => slot.speciesId === speciesId);
  }

  private placeSelectedFlowerToDecorDisplaySlot(
    slotId: string,
    options?: {
      successMessage?: string | null;
      failMessage?: string | null;
    }
  ): boolean {
    const saveCheck = this.getDecorSlotSaveCheck(slotId);
    if (!saveCheck.canSave) {
      this.showToast(saveCheck.reason);
      return false;
    }

    const speciesId = this.selectedDecorFlowerId;
    const selectedPotId = this.selectedDecorPotId;
    if (!speciesId || !selectedPotId) {
      this.showToast("저장 실패");
      return false;
    }

    const targetPage = this.decorPageIndex;
    const previousSlotState = this.getDecorDisplaySlotsForPage(targetPage).find((candidate) => candidate.slotId === slotId) ?? null;
    if (!previousSlotState && !DECOR_DISPLAY_SLOT_LAYOUT_BY_ID[slotId]) {
      this.showToast("슬롯 오류");
      return false;
    }

    const defaultSuccessMessage = "저장 완료";
    const defaultFailMessage = "저장 실패";
    const successMessage =
      options?.successMessage === undefined ? defaultSuccessMessage : options.successMessage ?? undefined;
    const failMessage =
      options?.failMessage === undefined ? defaultFailMessage : options.failMessage ?? undefined;

    return this.applyMutation(
      (draft) => {
        let slot = draft.decor.displaySlots.find((candidate) => candidate.page === targetPage && candidate.slotId === slotId);
        if (!slot) {
          const layout = DECOR_DISPLAY_SLOT_LAYOUT_BY_ID[slotId];
          if (!layout) {
            return false;
          }
          slot = {
            slotId,
            layer: layout.layer,
            page: targetPage,
            potId: selectedPotId,
            speciesId: null
          };
          draft.decor.displaySlots.push(slot);
        }
        const previousSpeciesId = slot.speciesId;
        const previousPotId = slot.potId;
        const duplicateSlot = draft.decor.displaySlots.find(
          (candidate) =>
            candidate.speciesId === speciesId && !(candidate.page === targetPage && candidate.slotId === slotId)
        );
        if (duplicateSlot) {
          return false;
        }
        if (!draft.collection.discoveredSpeciesIds.includes(speciesId)) {
          return false;
        }
        if (!draft.collection.ownedPotIds.includes(selectedPotId)) {
          return false;
        }
        if (previousSpeciesId !== speciesId) {
          const currentStock = Math.min(1, Math.max(0, Math.floor(draft.decor.displayFlowerCounts[speciesId] ?? 0)));
          if (currentStock <= 0) {
            return false;
          }
          if (previousSpeciesId && PLANT_BY_ID[previousSpeciesId]) {
            draft.decor.displayFlowerCounts[previousSpeciesId] = 1;
          }
          draft.decor.displayFlowerCounts[speciesId] = 0;
        }
        slot.speciesId = speciesId;
        slot.potId = selectedPotId;
        return previousSpeciesId !== speciesId || previousPotId !== selectedPotId;
      },
      successMessage,
      failMessage
    );
  }

  private retrieveDecorDisplaySlot(slotId: string): void {
    const targetPage = this.decorPageIndex;
    this.applyMutation(
      (draft) => {
        const slot = draft.decor.displaySlots.find((candidate) => candidate.page === targetPage && candidate.slotId === slotId);
        if (!slot || !slot.speciesId) {
          return false;
        }
        const speciesId = slot.speciesId;
        draft.decor.displayFlowerCounts[speciesId] = 1;
        slot.speciesId = null;
        return true;
      },
      "회수 완료",
      "이미 빈 슬롯"
    );
  }

  private placeSelectedFlowerToFirstEmptyDecorDisplaySlot(): void {
    const speciesId = this.selectedDecorFlowerId;
    const selectedPotId = this.selectedDecorPotId;
    if (!speciesId || !PLANT_BY_ID[speciesId]) {
      this.showToast("배치할 식물을 먼저 선택하세요.");
      return;
    }
    if (!selectedPotId || !POT_BY_ID[selectedPotId]) {
      this.showToast("배치할 화분을 먼저 선택하세요.");
      return;
    }
    const targetPage = this.decorPageIndex;
    this.applyMutation(
      (draft) => {
        const stock = Math.min(1, Math.max(0, Math.floor(draft.decor.displayFlowerCounts[speciesId] ?? 0)));
        if (stock <= 0) {
          return false;
        }
        if (draft.decor.displaySlots.some((slot) => slot.speciesId === speciesId)) {
          return false;
        }
        const emptySlot = DECOR_DISPLAY_SLOT_LAYOUT.find((layout) =>
          !draft.decor.displaySlots.some((slot) => slot.page === targetPage && slot.slotId === layout.slotId && Boolean(slot.speciesId))
        );
        if (!emptySlot) {
          return false;
        }
        let targetSlot = draft.decor.displaySlots.find(
          (slot) => slot.page === targetPage && slot.slotId === emptySlot.slotId
        );
        if (!targetSlot) {
          targetSlot = {
            slotId: emptySlot.slotId,
            layer: emptySlot.layer,
            page: targetPage,
            potId: selectedPotId,
            speciesId: null
          };
          draft.decor.displaySlots.push(targetSlot);
        }
        if (targetSlot.speciesId) {
          return false;
        }
        if (!draft.collection.ownedPotIds.includes(selectedPotId)) {
          return false;
        }
        draft.decor.displayFlowerCounts[speciesId] = 0;
        targetSlot.speciesId = speciesId;
        targetSlot.potId = selectedPotId;
        this.selectedDecorSlotId = targetSlot.slotId;
        return true;
      },
      "첫 빈 슬롯에 배치했습니다.",
      "이미 정원에 배치된 꽃이거나 빈 슬롯/재고가 없습니다."
    );
  }

  private retrieveAllDecorDisplaySlots(): void {
    const targetPage = this.decorPageIndex;
    const retrieved = this.applyMutation(
      (draft) => {
        let changed = false;
        for (const slot of draft.decor.displaySlots) {
          if (slot.page !== targetPage) {
            continue;
          }
          if (!slot.speciesId) {
            continue;
          }
          const speciesId = slot.speciesId;
          draft.decor.displayFlowerCounts[speciesId] = 1;
          slot.speciesId = null;
          changed = true;
        }
        if (changed) {
          this.selectedDecorSlotId = null;
        }
        return changed;
      },
      undefined,
      "회수할 배치가 없습니다."
    );
    if (retrieved) {
      this.showToast("현재 페이지 정원 배치를 모두 회수했습니다.");
    }
  }

  private renderDecorDisplayPlacedFlower(
    parent: Phaser.GameObjects.Container,
    layout: DecorDisplaySlotLayout,
    slotState: DecorDisplaySlotState,
    isSelected: boolean
  ): void {
    const speciesId = slotState.speciesId;
    if (!speciesId) {
      return;
    }
    const species = PLANT_BY_ID[speciesId];
    if (!species) {
      return;
    }

    const container = this.add.container(layout.x, layout.y + 8);
    // Add early so partial render failures cannot leave detached objects on the root display list.
    parent.add(container);
    // Garden tab is fixed to cartoon mode; pixel render path stays disabled.
    if (this.isDecorPixelSampleMode && this.activeTab !== "decorate") {
      this.renderDecorDisplayPixelPlantPot(container, speciesId, species, slotState.potId, layout.slotId);

      const displayName = truncateLabel(this.getDecorPlantDisplayName(speciesId), 7);
      const namePlateWidth = Math.max(66, Math.min(110, 32 + Array.from(displayName).length * 10));
      const namePlateStroke = isSelected ? 0x6f9a62 : 0xc6bda8;
      const tier = this.getDecorPixelPlantSizeTier(speciesId);
      const namePlateY = DECOR_PIXEL_TIER_PRESET[tier].namePlateY;
      this.renderDecorNamePlate(container, displayName, namePlateWidth, namePlateY, namePlateStroke);
      return;
    }

    const speciesGroup = getSpeciesGroupForSpecies(speciesId);
    const editModePlantOffsetY = this.isDecorEditMode
      ? speciesGroup === "foliage"
        ? 3
        : speciesGroup === "flower"
          ? -3
          : 0
      : 0;
    const decorPlantLiftY = speciesGroup === "succulent" ? -10 : -4;
    let plantWidth = 100;
    let plantHeight = 100;
    let plantYOffset = 8 + editModePlantOffsetY;
    const plantRenderCenterY = -30 + plantYOffset + decorPlantLiftY;
    const collectionCutoutTextureKey = getCollectionFlowerCutoutTextureKey(speciesId);
    const collectionSourceTextureKey = getCollectionFlowerTextureKey(speciesId);
    const plantTextureKey = this.textures.exists(collectionCutoutTextureKey)
      ? collectionCutoutTextureKey
      : this.textures.exists(collectionSourceTextureKey)
        ? collectionSourceTextureKey
        : null;

    const renderPlantImage = (): Phaser.GameObjects.Image | null => {
      if (!plantTextureKey) {
        return null;
      }
      return this.addContainedImage(container, plantTextureKey, 0, plantRenderCenterY, plantWidth, plantHeight);
    };

    const renderFallbackPlant = (): void => {
      if (!plantTextureKey) {
        const stemColor = hexToNumber(species.stemColorHex);
        const bloomColor = hexToNumber(species.bloomColorHex);
        container.add(this.add.rectangle(0, -22 + plantYOffset + decorPlantLiftY, 6, 36, stemColor));
        container.add(this.add.circle(0, -46 + plantYOffset + decorPlantLiftY, 16, bloomColor));
        container.add(this.add.circle(-12, -44 + plantYOffset + decorPlantLiftY, 9, bloomColor, 0.92));
        container.add(this.add.circle(12, -44 + plantYOffset + decorPlantLiftY, 9, bloomColor, 0.92));
      }
    };

    const soilMaskWidth = speciesGroup === "succulent" ? 38 : 32;
    const soilMaskHeight = speciesGroup === "succulent" ? 12 : 11;
    const soilMaskY = speciesGroup === "succulent" ? 6 : 8;
    const soilStemWidth = speciesGroup === "succulent" ? 12 : 8;
    const soilStemHeight = speciesGroup === "succulent" ? 8 : 10;
    const soilCapY = speciesGroup === "succulent" ? -2 : -3;
    const renderSoilCap = (): void => {
      // Keep the "rooted in soil" cue, but avoid dark drop-shadow look on the pot body.
      container.add(this.add.ellipse(0, soilCapY, 30, 8, 0x4f2d18, 0.5).setStrokeStyle(1, 0x6f4425, 0.35));
    };

    const previewPotId = POT_BY_ID.pot_clay ? "pot_clay" : POT_DEFS[0]?.id ?? "pot_clay";
    const renderPot = (): void => {
      const renderedPot = this.addPotPreviewImage(container, previewPotId, 0, 12, 74, 74);
      if (!renderedPot) {
        container.add(this.add.ellipse(0, 14, 68, 26, 0xb97849, 1).setStrokeStyle(2, 0x8f5a36));
        container.add(this.add.ellipse(0, 7, 72, 11, 0x8f5a36, 0.72));
      }
    };

    // Unified layering for flower/foliage/succulent:
    // 1) plant back -> 2) pot -> 3) masked stem/root pass -> 4) soil cap.
    const backPlantImage = renderPlantImage();
    if (!backPlantImage) {
      renderFallbackPlant();
    }
    renderPot();

    if (plantTextureKey) {
      const stemFrontImage = renderPlantImage();
      if (stemFrontImage) {
        const soilMaskShape = this.add.graphics();
        soilMaskShape.fillStyle(0xffffff, 1);
        soilMaskShape.fillEllipse(0, soilMaskY, soilMaskWidth, soilMaskHeight);
        // Vertical extension keeps the stem/root segment visible just below soil opening.
        soilMaskShape.fillRect(-soilStemWidth / 2, soilMaskY, soilStemWidth, soilStemHeight);
        soilMaskShape.visible = false;
        container.add(soilMaskShape);
        stemFrontImage.setMask(soilMaskShape.createGeometryMask());
      }
    } else {
      const fallbackStemWidth = speciesGroup === "succulent" ? 7 : 4;
      const fallbackStemHeight = speciesGroup === "succulent" ? 8 : 10;
      container.add(this.add.rectangle(0, soilMaskY + 1, fallbackStemWidth, fallbackStemHeight, hexToNumber(species.stemColorHex), 0.9));
    }
    renderSoilCap();

    const displayName = truncateLabel(this.getDecorPlantDisplayName(speciesId), 7);
    const namePlateWidth = Math.max(58, Math.min(98, 26 + Array.from(displayName).length * 10));
    const namePlateStroke = isSelected ? 0x6f9a62 : 0xc6bda8;
    container.add(this.add.rectangle(0, 50, namePlateWidth, 20, 0xf9f6ed, 0.96).setStrokeStyle(1.5, namePlateStroke, 0.92));
    container.add(
      this.add
        .text(0, 50, displayName, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: "#5a5d52",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
  }

  private renderDecorCartoonPot(
    container: Phaser.GameObjects.Container,
    potId: string,
    centerX: number,
    centerY: number
  ): void {
    const pot = POT_BY_ID[potId];
    const bodyColor = hexToNumber(pot?.colorHex ?? "#b97849", 0xb97849);
    const rimColor = hexToNumber(pot?.rimHex ?? "#8f5a36", 0x8f5a36);
    const outline = shiftColor(rimColor, -30);
    const soilColor = shiftColor(rimColor, -34);
    const bodyLight = shiftColor(bodyColor, 20);
    const bodyShade = shiftColor(bodyColor, -16);

    const potLayer = this.add.container(centerX, centerY);
    potLayer.add(this.add.ellipse(0, 33, 62, 12, 0x000000, 0.14));

    const bodyGraphics = this.add.graphics();
    const bodyPoints = [
      new Phaser.Math.Vector2(-24, 8),
      new Phaser.Math.Vector2(24, 8),
      new Phaser.Math.Vector2(15, 38),
      new Phaser.Math.Vector2(-15, 38)
    ];
    bodyGraphics.fillStyle(bodyColor, 0.98);
    bodyGraphics.lineStyle(2, outline, 0.9);
    bodyGraphics.fillPoints(bodyPoints, true);
    bodyGraphics.strokePoints(bodyPoints, true);

    bodyGraphics.fillStyle(bodyShade, 0.25);
    bodyGraphics.fillPoints(
      [
        new Phaser.Math.Vector2(2, 10),
        new Phaser.Math.Vector2(22, 10),
        new Phaser.Math.Vector2(13, 37),
        new Phaser.Math.Vector2(1, 37)
      ],
      true
    );
    bodyGraphics.fillStyle(bodyLight, 0.28);
    bodyGraphics.fillPoints(
      [
        new Phaser.Math.Vector2(-22, 10),
        new Phaser.Math.Vector2(-4, 10),
        new Phaser.Math.Vector2(-2, 37),
        new Phaser.Math.Vector2(-13, 37)
      ],
      true
    );
    potLayer.add(bodyGraphics);

    potLayer.add(this.add.ellipse(0, 7, 62, 16, rimColor, 1).setStrokeStyle(2, outline, 0.9));
    potLayer.add(this.add.ellipse(0, 5, 52, 6, bodyLight, 0.38));
    potLayer.add(this.add.ellipse(0, 7, 44, 9, soilColor, 0.96).setStrokeStyle(1.5, shiftColor(soilColor, -18), 0.78));
    potLayer.add(this.add.ellipse(0, 5, 30, 3, shiftColor(soilColor, 12), 0.28));
    potLayer.add(this.add.ellipse(0, 38, 31, 6, shiftColor(bodyShade, -8), 0.74));

    container.add(potLayer);
  }

  private renderDecorCartoonPriorityPlant(
    container: Phaser.GameObjects.Container,
    species: PlantSpeciesDef,
    speciesId: string,
    plantYOffset: number
  ): boolean {
    const stemColor = hexToNumber(species.stemColorHex, 0x4f8f4b);
    const stemDark = shiftColor(stemColor, -18);
    const leafColor = shiftColor(stemColor, 16);
    const leafShadeColor = shiftColor(stemColor, -12);
    const bloomBase = speciesId === "plant_rose" ? 0xd7343f : hexToNumber(species.bloomColorHex, 0xf08cab);
    const bloomLight = shiftColor(bloomBase, 24);
    const bloomDark = shiftColor(bloomBase, -22);
    const outline = 0x445043;
    const y = plantYOffset;
    const isFlowerSpecies = getSpeciesGroupForSpecies(speciesId) === "flower";
    const stemCenterY = (isFlowerSpecies ? -10 : -14) + y;
    const stemHeight = isFlowerSpecies ? 32 : 44;
    container.add(this.add.rectangle(0, stemCenterY, 5, stemHeight, stemColor).setStrokeStyle(1.6, outline, 0.9));
    container.add(this.add.rectangle(-1, stemCenterY, 1.5, stemHeight - 2, stemDark, 0.45));

    if (speciesId === "plant_monstera") {
      const branchColor = shiftColor(stemColor, -8);
      const leafBase = shiftColor(stemColor, 10);
      const leafShadow = shiftColor(stemColor, -12);
      const leafHighlight = shiftColor(stemColor, 24);

      const petioleDefs = [
        { x: -13, y: -26 + y, h: 20, angle: -30 },
        { x: 13, y: -25 + y, h: 20, angle: 29 },
        { x: -4, y: -36 + y, h: 22, angle: -12 },
        { x: 7, y: -35 + y, h: 22, angle: 10 }
      ] as const;
      for (const petiole of petioleDefs) {
        container.add(
          this.add
            .rectangle(petiole.x, petiole.y, 3, petiole.h, branchColor)
            .setAngle(petiole.angle)
            .setStrokeStyle(1, outline, 0.55)
        );
      }

      const leafDefs = [
        { x: -21, y: -35 + y, w: 30, h: 38, angle: -31, tone: leafBase },
        { x: 22, y: -34 + y, w: 30, h: 38, angle: 30, tone: leafShadow },
        { x: -2, y: -48 + y, w: 34, h: 41, angle: -7, tone: leafBase },
        { x: 8, y: -30 + y, w: 24, h: 28, angle: 12, tone: leafShadow }
      ] as const;
      for (const leaf of leafDefs) {
        container.add(
          this.add
            .ellipse(leaf.x, leaf.y, leaf.w, leaf.h, leaf.tone, 0.99)
            .setAngle(leaf.angle)
            .setStrokeStyle(1.75, outline, 0.82)
        );
        container.add(
          this.add
            .ellipse(leaf.x + 2, leaf.y + 1, Math.max(10, leaf.w - 14), Math.max(12, leaf.h - 16), leafHighlight, 0.22)
            .setAngle(leaf.angle)
        );
      }

      // Monstera splits are edge cuts from mid-to-lower leaf area (not inner holes).
      const splitCutColor = 0xf4efdf;
      const splitCutDefs = [
        { x: -34, y: -34 + y, ax: -5, ay: -5, bx: -2, by: 11, angle: -26 },
        { x: -31, y: -25 + y, ax: -4, ay: -4, bx: -2, by: 10, angle: -12 },
        { x: -27, y: -18 + y, ax: -4, ay: -3, bx: -2, by: 8, angle: -2 },
        { x: 34, y: -33 + y, ax: 5, ay: -5, bx: 2, by: 11, angle: 26 },
        { x: 31, y: -24 + y, ax: 4, ay: -4, bx: 2, by: 10, angle: 12 },
        { x: 27, y: -17 + y, ax: 4, ay: -3, bx: 2, by: 8, angle: 2 },
        { x: -11, y: -24 + y, ax: -3, ay: -4, bx: -1, by: 8, angle: -12 },
        { x: 16, y: -23 + y, ax: 3, ay: -4, bx: 1, by: 8, angle: 12 }
      ] as const;
      for (const cut of splitCutDefs) {
        container.add(
          this.add
            .triangle(cut.x, cut.y, 0, 0, cut.ax, cut.ay, cut.bx, cut.by, splitCutColor, 0.94)
            .setAngle(cut.angle)
            .setStrokeStyle(0.8, shiftColor(leafShadow, -16), 0.18)
        );
      }

      const splitLines = this.add.graphics();
      splitLines.lineStyle(1.35, shiftColor(leafShadow, -18), 0.62);
      splitLines.beginPath();
      splitLines.moveTo(-19, -37 + y);
      splitLines.lineTo(-24, -24 + y);
      splitLines.lineTo(-26, -14 + y);
      splitLines.strokePath();
      splitLines.beginPath();
      splitLines.moveTo(19, -36 + y);
      splitLines.lineTo(24, -23 + y);
      splitLines.lineTo(26, -13 + y);
      splitLines.strokePath();
      splitLines.beginPath();
      splitLines.moveTo(-3, -47 + y);
      splitLines.lineTo(-7, -34 + y);
      splitLines.lineTo(-9, -23 + y);
      splitLines.strokePath();
      splitLines.beginPath();
      splitLines.moveTo(9, -46 + y);
      splitLines.lineTo(13, -33 + y);
      splitLines.lineTo(15, -23 + y);
      splitLines.strokePath();
      splitLines.beginPath();
      splitLines.moveTo(0, -15 + y);
      splitLines.lineTo(-1, -45 + y);
      splitLines.strokePath();
      container.add(splitLines);
      return true;
    }

    if (speciesId === "plant_tulip") {
      container.add(this.add.ellipse(-10, -7 + y, 21, 11, leafColor, 0.98).setAngle(-33).setStrokeStyle(1.6, outline, 0.82));
      container.add(this.add.ellipse(11, -8 + y, 21, 11, leafShadeColor, 0.98).setAngle(30).setStrokeStyle(1.6, outline, 0.82));
      container.add(this.add.ellipse(-6, -22 + y, 10, 20, leafColor, 0.94).setAngle(-28).setStrokeStyle(1.2, outline, 0.68));
      container.add(this.add.ellipse(6, -24 + y, 10, 20, leafShadeColor, 0.94).setAngle(26).setStrokeStyle(1.2, outline, 0.68));

      // Closed tulip shape: narrower, petals gathered upward.
      container.add(this.add.ellipse(-6, -50 + y, 12, 23, bloomDark, 0.98).setAngle(-11).setStrokeStyle(1.8, outline, 0.84));
      container.add(this.add.ellipse(6, -50 + y, 12, 23, bloomDark, 0.98).setAngle(11).setStrokeStyle(1.8, outline, 0.84));
      container.add(this.add.ellipse(0, -54 + y, 15, 31, bloomBase, 0.99).setStrokeStyle(1.9, outline, 0.88));
      container.add(this.add.ellipse(0, -45 + y, 17, 11, shiftColor(bloomBase, -8), 0.98).setStrokeStyle(1.5, outline, 0.74));
      container.add(this.add.triangle(0, -62 + y, -4, 7, 0, 0, 4, 7, shiftColor(bloomDark, 6), 0.92).setStrokeStyle(1.1, outline, 0.6));
      container.add(this.add.ellipse(0, -37 + y, 22, 8, shiftColor(stemColor, 10), 0.95).setStrokeStyle(1.3, outline, 0.7));
      container.add(this.add.ellipse(0, -58 + y, 7, 10, bloomLight, 0.9).setStrokeStyle(1, outline, 0.55));
      return true;
    }

    if (speciesId === "plant_daisy") {
      const centerX = 0;
      const centerY = -46 + y;
      const petalCount = 12;
      for (let index = 0; index < petalCount; index += 1) {
        const angle = (Math.PI * 2 * index) / petalCount;
        container.add(
          this.add
            .ellipse(centerX + Math.cos(angle) * 12.5, centerY + Math.sin(angle) * 8.2, 8.6, 19, 0xf6f4ea, 0.98)
            .setAngle(Phaser.Math.RadToDeg(angle) + 90)
            .setStrokeStyle(1.1, 0x5e6658, 0.54)
        );
      }
      container.add(this.add.circle(centerX, centerY, 6.8, 0xf1bf3d, 0.98).setStrokeStyle(1.4, outline, 0.7));
      container.add(this.add.ellipse(-8, -7 + y, 17, 10, leafColor, 0.97).setAngle(-28).setStrokeStyle(1.3, outline, 0.7));
      container.add(this.add.ellipse(9, -8 + y, 17, 10, leafShadeColor, 0.97).setAngle(28).setStrokeStyle(1.3, outline, 0.7));
      return true;
    }

    if (speciesId === "plant_anemone") {
      const centerX = 0;
      const centerY = -46 + y;
      const petalCount = 8;
      const anemoneMain = 0x7f69bd;
      const anemoneAlt = 0x9b87d2;
      const anemoneLight = 0xc8bce9;
      for (let index = 0; index < petalCount; index += 1) {
        const angle = (Math.PI * 2 * index) / petalCount;
        const petalColor = index % 2 === 0 ? anemoneMain : anemoneAlt;
        container.add(
          this.add
            .ellipse(centerX + Math.cos(angle) * 11.5, centerY + Math.sin(angle) * 8, 10.4, 19, petalColor, 0.97)
            .setAngle(Phaser.Math.RadToDeg(angle) + 90)
            .setStrokeStyle(1.2, outline, 0.68)
        );
      }
      container.add(this.add.ellipse(0, centerY - 2, 12, 9, anemoneLight, 0.42));
      container.add(this.add.circle(centerX, centerY, 6.2, 0x2e3430, 0.96).setStrokeStyle(1, 0x6f7770, 0.62));
      container.add(this.add.ellipse(-9, -7 + y, 18, 10, leafColor, 0.96).setAngle(-28).setStrokeStyle(1.2, outline, 0.66));
      container.add(this.add.ellipse(10, -7 + y, 18, 10, leafShadeColor, 0.96).setAngle(30).setStrokeStyle(1.2, outline, 0.66));
      return true;
    }

    if (speciesId === "plant_calendula") {
      const pompomY = -45 + y;
      for (let ring = 0; ring < 2; ring += 1) {
        const count = ring === 0 ? 15 : 11;
        const radius = ring === 0 ? 14 : 9;
        for (let index = 0; index < count; index += 1) {
          const angle = (Math.PI * 2 * index) / count + (ring === 0 ? 0 : Math.PI / count);
          const tone = ring === 0 ? bloomDark : bloomBase;
          container.add(
            this.add
              .ellipse(
                Math.cos(angle) * radius,
                pompomY + Math.sin(angle) * (radius * 0.85),
                ring === 0 ? 8 : 7,
                ring === 0 ? 15 : 12,
                tone,
                0.98
              )
              .setAngle(Phaser.Math.RadToDeg(angle) + 90)
              .setStrokeStyle(1.2, outline, 0.68)
          );
        }
      }
      container.add(this.add.circle(0, pompomY, 8, bloomLight, 0.9).setStrokeStyle(1, outline, 0.58));
      container.add(this.add.ellipse(-8, -7 + y, 17, 10, leafColor, 0.96).setAngle(-26).setStrokeStyle(1.2, outline, 0.66));
      container.add(this.add.ellipse(9, -7 + y, 17, 10, leafShadeColor, 0.96).setAngle(28).setStrokeStyle(1.2, outline, 0.66));
      return true;
    }

    if (speciesId === "plant_canna_lily") {
      const cannaYellowBase = 0xf0c83e;
      const cannaYellowDark = 0xdaab22;
      const cannaYellowLight = 0xf8dd75;
      container.add(this.add.ellipse(-8, -7 + y, 18, 10, leafColor, 0.97).setAngle(-30).setStrokeStyle(1.3, outline, 0.68));
      container.add(this.add.ellipse(10, -7 + y, 18, 10, leafShadeColor, 0.97).setAngle(30).setStrokeStyle(1.3, outline, 0.68));
      container.add(this.add.ellipse(0, -32 + y, 15, 29, shiftColor(stemColor, 22), 0.96).setStrokeStyle(1.3, outline, 0.65));
      container.add(this.add.ellipse(0, -47 + y, 25, 21, cannaYellowBase, 0.98).setAngle(-14).setStrokeStyle(1.5, outline, 0.74));
      container.add(this.add.ellipse(12, -44 + y, 19, 16, cannaYellowDark, 0.95).setAngle(26).setStrokeStyle(1.4, outline, 0.72));
      container.add(this.add.ellipse(4, -40 + y, 12, 10, cannaYellowLight, 0.92).setStrokeStyle(1, outline, 0.55));
      return true;
    }

    if (speciesId === "plant_rose") {
      container.add(this.add.ellipse(-12, -7 + y, 21, 11, leafColor, 0.98).setAngle(-30).setStrokeStyle(1.6, outline, 0.82));
      container.add(this.add.ellipse(12, -8 + y, 21, 11, leafShadeColor, 0.98).setAngle(32).setStrokeStyle(1.6, outline, 0.82));
      container.add(this.add.ellipse(0, -31 + y, 14, 8, shiftColor(stemColor, 8), 0.95).setStrokeStyle(1.2, outline, 0.72));
      container.add(this.add.ellipse(-7, -30 + y, 8, 6, shiftColor(stemColor, 14), 0.9).setAngle(-24).setStrokeStyle(1.1, outline, 0.6));
      container.add(this.add.ellipse(7, -30 + y, 8, 6, shiftColor(stemColor, 14), 0.9).setAngle(24).setStrokeStyle(1.1, outline, 0.6));
      container.add(this.add.triangle(0, -32 + y, -8, 0, 8, 0, 0, -10, shiftColor(stemColor, -8), 0.84).setStrokeStyle(1, outline, 0.54));

      const roseCenterY = -49 + y;
      const rosePetals = [
        { x: -16, y: roseCenterY - 3, w: 23, h: 26, color: bloomDark, angle: -24 },
        { x: 16, y: roseCenterY - 3, w: 23, h: 26, color: bloomDark, angle: 24 },
        { x: 0, y: roseCenterY - 14, w: 22, h: 24, color: bloomDark, angle: 0 },
        { x: -10, y: roseCenterY + 2, w: 20, h: 22, color: bloomBase, angle: -12 },
        { x: 10, y: roseCenterY + 2, w: 20, h: 22, color: bloomBase, angle: 12 },
        { x: 0, y: roseCenterY + 1, w: 21, h: 23, color: bloomBase, angle: 0 },
        { x: -13, y: roseCenterY + 14, w: 24, h: 16, color: bloomDark, angle: -14 },
        { x: 13, y: roseCenterY + 14, w: 24, h: 16, color: bloomDark, angle: 14 },
        { x: 0, y: roseCenterY + 15, w: 27, h: 16, color: bloomBase, angle: 0 },
        { x: -5, y: roseCenterY - 5, w: 11, h: 13, color: bloomLight, angle: -20 },
        { x: 5, y: roseCenterY - 5, w: 11, h: 13, color: bloomLight, angle: 20 },
        { x: 0, y: roseCenterY - 4, w: 10, h: 11, color: shiftColor(bloomLight, 10), angle: 0 }
      ];
      for (const petal of rosePetals) {
        container.add(
          this.add
            .ellipse(petal.x, petal.y, petal.w, petal.h, petal.color, 0.98)
            .setAngle(petal.angle)
            .setStrokeStyle(1.7, outline, 0.82)
        );
      }

      container.add(this.add.ellipse(-4, roseCenterY + 2, 12, 11, bloomLight, 0.94).setStrokeStyle(1.2, outline, 0.62));
      container.add(this.add.ellipse(4, roseCenterY + 2, 12, 11, bloomLight, 0.94).setStrokeStyle(1.2, outline, 0.62));
      container.add(this.add.ellipse(0, roseCenterY + 4, 11, 10, bloomLight, 0.95).setStrokeStyle(1.2, outline, 0.66));
      container.add(this.add.ellipse(0, roseCenterY - 6, 10, 10, shiftColor(bloomLight, 8), 0.92).setStrokeStyle(1.1, outline, 0.56));

      const fold = this.add.graphics();
      fold.lineStyle(1.4, shiftColor(bloomDark, -14), 0.86);
      fold.beginPath();
      fold.moveTo(-6, roseCenterY + 3);
      fold.lineTo(-1, roseCenterY -1);
      fold.lineTo(3, roseCenterY + 2);
      fold.strokePath();
      fold.beginPath();
      fold.moveTo(-8, roseCenterY - 1);
      fold.lineTo(-2, roseCenterY - 6);
      fold.lineTo(4, roseCenterY - 5);
      fold.strokePath();
      fold.beginPath();
      fold.moveTo(-2, roseCenterY - 7);
      fold.lineTo(2, roseCenterY - 10);
      fold.lineTo(5, roseCenterY - 4);
      fold.strokePath();
      fold.beginPath();
      fold.moveTo(-4, roseCenterY - 10);
      fold.lineTo(0, roseCenterY - 12);
      fold.lineTo(3, roseCenterY - 8);
      fold.strokePath();
      fold.beginPath();
      fold.moveTo(4, roseCenterY - 10);
      fold.lineTo(1, roseCenterY - 12);
      fold.lineTo(-1, roseCenterY - 9);
      fold.strokePath();
      container.add(fold);
      return true;
    }

    const speciesGroup = getSpeciesGroupForSpecies(speciesId);
    const variantSeed = Array.from(speciesId).reduce((acc, char) => (acc * 33 + char.charCodeAt(0)) % 997, 17);

    if (speciesGroup === "flower") {
      container.add(this.add.ellipse(-10, -7 + y, 18, 10, leafColor, 0.98).setAngle(-30).setStrokeStyle(1.5, outline, 0.78));
      container.add(this.add.ellipse(11, -8 + y, 18, 10, leafShadeColor, 0.98).setAngle(30).setStrokeStyle(1.5, outline, 0.78));

      const petalCount = 5 + (variantSeed % 3);
      const ringRadiusX = 15 + (variantSeed % 2);
      const ringRadiusY = 10 + (variantSeed % 2);
      const petalWidth = 16 + (variantSeed % 3);
      const petalHeight = 22 + ((variantSeed >> 2) % 3);
      const centerY = -48 + y;

      for (let index = 0; index < petalCount; index += 1) {
        const angle = (Math.PI * 2 * index) / petalCount;
        const petalX = Math.cos(angle) * ringRadiusX;
        const petalY = centerY + Math.sin(angle) * ringRadiusY;
        const petalRotation = Phaser.Math.RadToDeg(angle) + 90;
        const petalTone = index % 2 === 0 ? bloomBase : bloomDark;
        container.add(
          this.add
            .ellipse(petalX, petalY, petalWidth, petalHeight, petalTone, 0.98)
            .setAngle(petalRotation)
            .setStrokeStyle(1.5, outline, 0.74)
        );
      }

      container.add(this.add.circle(0, centerY, 10.6, bloomLight, 0.98).setStrokeStyle(1.4, outline, 0.66));
      container.add(this.add.circle(-2, centerY - 1, 4, shiftColor(bloomLight, 16), 0.75));
      return true;
    }

    if (speciesGroup === "foliage") {
      const branchColor = shiftColor(stemColor, -8);
      const leafMain = shiftColor(stemColor, 10);
      const leafAlt = shiftColor(stemColor, -8);
      const leafHighlight = shiftColor(stemColor, 22);
      const leafCount = 5 + (variantSeed % 3);

      container.add(this.add.rectangle(0, -12 + y, 5, 40, stemColor).setStrokeStyle(1.4, outline, 0.8));
      container.add(this.add.rectangle(-1, -12 + y, 1.5, 38, stemDark, 0.45));

      for (let index = 0; index < leafCount; index += 1) {
        const progress = leafCount === 1 ? 0 : index / (leafCount - 1);
        const side = index % 2 === 0 ? -1 : 1;
        const branchY = -30 + y + progress * 22;
        const branchAngle = side < 0 ? -28 : 28;
        const leafX = side * (8 + progress * 8);
        const leafY = branchY - 2;
        const leafW = 14 + (variantSeed % 3) + (1 - progress) * 4;
        const leafH = 18 + (variantSeed % 2) + (1 - progress) * 5;
        const leafTone = index % 2 === 0 ? leafMain : leafAlt;

        container.add(this.add.rectangle(side * 4, branchY, 2.5, 14, branchColor).setAngle(branchAngle).setStrokeStyle(1, outline, 0.48));
        container.add(
          this.add
            .ellipse(leafX, leafY, leafW, leafH, leafTone, 0.99)
            .setAngle(branchAngle)
            .setStrokeStyle(1.4, outline, 0.72)
        );
        container.add(this.add.ellipse(leafX + side, leafY + 1, Math.max(7, leafW - 7), Math.max(8, leafH - 9), leafHighlight, 0.2).setAngle(branchAngle));
      }
      return true;
    }

    const isCactusLike =
      speciesId === "plant_roadkill_cactus" ||
      speciesId === "plant_stuckyi" ||
      speciesId === "plant_astrophytum" ||
      speciesId === "plant_aloe" ||
      speciesId === "plant_aloe_mitriformis";
    if (isCactusLike) {
      const cactusBody = shiftColor(stemColor, 8);
      const cactusShade = shiftColor(stemColor, -16);
      const cactusLight = shiftColor(stemColor, 22);
      container.add(this.add.rectangle(0, -20 + y, 18, 38, cactusBody, 1).setStrokeStyle(1.6, outline, 0.8));
      container.add(this.add.rectangle(-8, -13 + y, 10, 23, cactusShade, 0.96).setStrokeStyle(1.3, outline, 0.72));
      container.add(this.add.rectangle(8, -11 + y, 10, 20, cactusShade, 0.96).setStrokeStyle(1.3, outline, 0.72));
      container.add(this.add.rectangle(0, -20 + y, 7, 34, cactusLight, 0.24));
      return true;
    }

    const succulentBase = shiftColor(stemColor, 10);
    const succulentShade = shiftColor(stemColor, -14);
    const succulentLight = shiftColor(stemColor, 24);
    const rosetteCenterY = -24 + y;
    for (let ring = 0; ring < 2; ring += 1) {
      const count = ring === 0 ? 6 : 4;
      const radius = ring === 0 ? 13 : 8;
      const petalWidth = ring === 0 ? 12 : 10;
      const petalHeight = ring === 0 ? 20 : 15;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + (ring === 0 ? 0 : Math.PI / count);
        const petalX = Math.cos(angle) * radius;
        const petalY = rosetteCenterY + Math.sin(angle) * (radius * 0.55);
        const petalRotation = Phaser.Math.RadToDeg(angle) + 90;
        const petalTone = (index + ring) % 2 === 0 ? succulentBase : succulentShade;
        container.add(
          this.add
            .ellipse(petalX, petalY, petalWidth, petalHeight, petalTone, 0.98)
            .setAngle(petalRotation)
            .setStrokeStyle(1.4, outline, 0.74)
        );
      }
    }
    container.add(this.add.circle(0, rosetteCenterY, 6, succulentLight, 0.92).setStrokeStyle(1, outline, 0.58));
    return true;
  }

  private getDecorPixelPlantSizeTier(speciesId: string): PixelPlantSizeTier {
    return DECOR_PIXEL_SPECIES_TIER[speciesId] ?? "medium";
  }

  private renderDecorNamePlate(
    container: Phaser.GameObjects.Container,
    displayName: string,
    width: number,
    centerY: number,
    strokeColor: number
  ): void {
    if (DECOR_NAME_PLATE_STYLE === "rect") {
      container.add(this.add.rectangle(0, centerY + 2, width, 20, 0x000000, 0.12));
      container.add(this.add.rectangle(0, centerY, width, 20, 0xf9f6ed, 0.98).setStrokeStyle(1.5, strokeColor, 0.92));
      container.add(this.add.rectangle(0, centerY - 8.5, width - 6, 3, 0xffffff, 0.35));
    } else {
      const shadowGraphics = this.add.graphics();
      shadowGraphics.fillStyle(0x000000, 0.12);
      shadowGraphics.fillRoundedRect(-width / 2, centerY - 8, width, 20, 7);
      container.add(shadowGraphics);

      const bodyGraphics = this.add.graphics();
      bodyGraphics.fillStyle(0xf9f6ed, 0.98);
      bodyGraphics.lineStyle(1.5, strokeColor, 0.92);
      bodyGraphics.fillRoundedRect(-width / 2, centerY - 10, width, 20, 7);
      bodyGraphics.strokeRoundedRect(-width / 2, centerY - 10, width, 20, 7);
      bodyGraphics.fillStyle(0xffffff, 0.32);
      bodyGraphics.fillRoundedRect(-width / 2 + 3, centerY - 9, width - 6, 3, 3);
      container.add(bodyGraphics);
    }

    container.add(
      this.add
        .text(0, centerY, displayName, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#4d5248",
          fontStyle: "700",
          stroke: "#ffffff",
          strokeThickness: 1
        })
        .setOrigin(0.5)
    );
  }

  private renderDecorEmptySlotPlus(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    isPixelSampleMode: boolean
  ): void {
    const plusColor = isPixelSampleMode ? 0x5f9a57 : 0x7a8d72;
    if (DECOR_EMPTY_SLOT_PLUS_STYLE === "line") {
      panel.add(
        this.add
          .text(x, y, "+", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: isPixelSampleMode ? "34px" : "30px",
            color: isPixelSampleMode ? "#5f9a57" : "#7a8d72",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      return;
    }

    const plusGraphics = this.add.graphics();
    const arm = isPixelSampleMode ? 7 : 6;
    const thickness = isPixelSampleMode ? 5 : 4;
    plusGraphics.fillStyle(plusColor, 0.95);
    plusGraphics.fillRect(Math.round(x - thickness / 2), Math.round(y - arm), thickness, arm * 2);
    plusGraphics.fillRect(Math.round(x - arm), Math.round(y - thickness / 2), arm * 2, thickness);
    plusGraphics.fillStyle(0xffffff, 0.24);
    plusGraphics.fillRect(Math.round(x - thickness / 2), Math.round(y - arm), Math.max(1, thickness - 1), 1);
    plusGraphics.fillRect(Math.round(x - arm), Math.round(y - thickness / 2), arm * 2, 1);
    panel.add(plusGraphics);
  }

  private renderDecorEmptyDisplaySlot(
    panel: Phaser.GameObjects.Container,
    layout: DecorDisplaySlotLayout,
    isPixelStyleMode: boolean,
    isEditMode: boolean,
    isClearMode: boolean,
    canQuickPlace: boolean
  ): void {
    panel.add(this.add.ellipse(layout.x, layout.y + 44, 64, 14, 0x000000, isPixelStyleMode ? 0.1 : 0.07));
    panel.add(
      this.add
        .rectangle(layout.x, layout.y + 10, 92, 106, 0xffffff, 0.04)
        .setStrokeStyle(1.5, 0xc7bca5, 0.84)
    );
    this.renderDecorEmptySlotPlus(panel, layout.x, layout.y + 8, isPixelStyleMode);
    panel.add(
      this.add
        .text(layout.x, layout.y + 53, "빈 슬롯", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: "#877d67",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    const hintLabel = isClearMode
      ? "탭하면 비워집니다"
      : isEditMode
        ? canQuickPlace
          ? "탭해서 배치"
          : "식물/화분 선택"
        : "편집 후 탭 배치";
    const hintColor = isClearMode ? "#8a5f53" : isEditMode && canQuickPlace ? "#4f7f46" : "#8d8673";
    const hintContainer = this.add.container(layout.x, layout.y + 70);
    const hintIconX = -39;
    hintContainer.add(
      this.add
        .circle(hintIconX, 0, 5.5, 0x6f8465, isEditMode && canQuickPlace ? 0.2 : 0.12)
        .setStrokeStyle(1.3, 0x5f7d56, 0.9)
    );
    hintContainer.add(this.add.circle(hintIconX, 0, 2.1, 0x5f7d56, 0.95));
    hintContainer.add(
      this.add
        .text(hintIconX + 10, 0, hintLabel, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "10px",
          color: hintColor,
          fontStyle: "700"
        })
        .setOrigin(0, 0.5)
    );
    panel.add(hintContainer);
  }

  private renderDecorDisplayPixelPlantPot(
    container: Phaser.GameObjects.Container,
    speciesId: string,
    species: PlantSpeciesDef,
    _potId: string,
    slotId: string
  ): void {
    const potBodyColor = DECOR_PIXEL_POT_PALETTE.body;
    const potRimColor = DECOR_PIXEL_POT_PALETTE.rim;
    const soilColor = DECOR_PIXEL_POT_PALETTE.soil;
    const stemColor = hexToNumber(species.stemColorHex, 0x5a8f54);
    const bloomColor = hexToNumber(species.bloomColorHex, 0xe98b77);
    const leafColor = shiftColor(stemColor, 26);
    const leafDark = shiftColor(stemColor, -10);
    const bloomDark = shiftColor(bloomColor, -24);
    const bloomLight = shiftColor(bloomColor, 18);
    const u = 2;
    const tier = this.getDecorPixelPlantSizeTier(speciesId);
    const tierPreset = DECOR_PIXEL_TIER_PRESET[tier];
    const potScale = tierPreset.potScale;
    const plantScale = tierPreset.plantScale;
    const plantLayer = this.add.container(0, tierPreset.plantOffsetY);
    const potLayer = this.add.container(0, tierPreset.potOffsetY);
    container.add(this.add.ellipse(0, 27, 82, 18, DECOR_PIXEL_POT_PALETTE.shadow, 0.16));
    container.add(this.add.ellipse(0, 28, 64, 10, 0xf2e7cf, 0.26));
    container.add(potLayer);
    container.add(plantLayer);

    const potGraphics = this.add.graphics();
    const potPx = (x: number, y: number, w: number, h: number, color: number, alpha = 1): void => {
      potGraphics.fillStyle(color, alpha);
      potGraphics.fillRect(Math.round(x * u), Math.round(y * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u)));
    };
    potPx(-12, 4, 24, 2, potRimColor);
    potPx(-10, 6, 20, 1, DECOR_PIXEL_POT_PALETTE.rimLight, 0.95);
    potPx(-8, 3, 16, 1, DECOR_PIXEL_POT_PALETTE.rimTopLight, 0.82);
    potPx(-8, 5, 16, 2, soilColor, 0.95);
    potPx(-6, 4, 12, 1, DECOR_PIXEL_POT_PALETTE.soilLight, 0.72);
    const potRows = [18, 18, 17, 17, 16, 16, 15, 15, 14, 14];
    potRows.forEach((width, rowIndex) => {
      const x = -Math.floor(width / 2);
      potPx(x, 7 + rowIndex, width, 1, potBodyColor);
    });
    potPx(3, 8, 5, 8, DECOR_PIXEL_POT_PALETTE.bodyShade, 0.34);
    potPx(-8, 8, 4, 8, DECOR_PIXEL_POT_PALETTE.bodyLight, 0.3);
    potPx(-9, 16, 18, 1, DECOR_PIXEL_POT_PALETTE.bodyBottom, 0.6);
    potLayer.add(potGraphics);
    potLayer.setScale(potScale);

    const plantGraphics = this.add.graphics();
    const plantPx = (x: number, y: number, w: number, h: number, color: number, alpha = 1): void => {
      plantGraphics.fillStyle(color, alpha);
      plantGraphics.fillRect(Math.round(x * u), Math.round(y * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u)));
    };
    const drawStem = (x: number, fromY: number, toY: number, width = 1): void => {
      const startY = Math.min(fromY, toY);
      const endY = Math.max(fromY, toY);
      plantPx(x, startY, width, endY - startY + 1, stemColor);
    };

    if (speciesId === "plant_rose") {
      const roseTextureKey = this.textures.exists(DECOR_PIXEL_ROSE_CUTOUT_TEXTURE_KEY)
        ? DECOR_PIXEL_ROSE_CUTOUT_TEXTURE_KEY
        : this.textures.exists(DECOR_PIXEL_ROSE_TEXTURE_KEY)
          ? DECOR_PIXEL_ROSE_TEXTURE_KEY
          : null;
      if (roseTextureKey) {
        this.addContainedImage(plantLayer, roseTextureKey, 0, -28, 62, 68);
        plantPx(-1, 2, 2, 2, shiftColor(stemColor, -8), 0.7);
      } else {
        drawStem(0, -10, 4);
        plantPx(-4, -4, 4, 2, leafColor);
        plantPx(1, -5, 4, 2, leafDark);
        plantPx(-4, -21, 8, 2, bloomDark);
        plantPx(-5, -19, 10, 4, bloomColor);
        plantPx(-4, -15, 8, 3, bloomDark, 0.72);
        plantPx(-2, -18, 4, 2, bloomLight, 0.84);
      }
    } else if (speciesId === "plant_tulip") {
      drawStem(0, -10, 4);
      plantPx(-3, -4, 3, 2, leafColor);
      plantPx(1, -6, 3, 2, leafDark);
      plantPx(-2, -18, 5, 4, bloomColor);
      plantPx(-1, -20, 1, 2, bloomLight);
      plantPx(1, -20, 1, 2, bloomLight);
      plantPx(-2, -17, 1, 3, bloomDark, 0.7);
    } else if (speciesId === "plant_calendula") {
      drawStem(0, -10, 4);
      plantPx(-2, -6, 3, 2, leafColor);
      plantPx(0, -5, 3, 2, leafDark);
      plantPx(-5, -22, 10, 3, bloomDark);
      plantPx(-6, -19, 12, 6, bloomColor);
      plantPx(-4, -17, 8, 2, bloomLight, 0.82);
    } else if (speciesId === "plant_monstera") {
      const monsteraTextureKey = this.textures.exists(DECOR_PIXEL_MONSTERA_CUTOUT_TEXTURE_KEY)
        ? DECOR_PIXEL_MONSTERA_CUTOUT_TEXTURE_KEY
        : this.textures.exists(DECOR_PIXEL_MONSTERA_TEXTURE_KEY)
          ? DECOR_PIXEL_MONSTERA_TEXTURE_KEY
          : null;
      if (monsteraTextureKey) {
        this.addContainedImage(plantLayer, monsteraTextureKey, 0, -30, 66, 72);
        plantPx(-1, 2, 2, 2, shiftColor(stemColor, -8), 0.72);
      } else {
        drawStem(-1, -8, 4, 2);
        plantPx(-10, -20, 8, 8, leafDark);
        plantPx(-2, -18, 7, 8, leafColor);
        plantPx(4, -21, 8, 9, leafDark);
        plantPx(-8, -16, 2, 2, 0xf7ecd4, 0.85);
        plantPx(0, -15, 2, 2, 0xf7ecd4, 0.85);
        plantPx(6, -16, 2, 2, 0xf7ecd4, 0.85);
      }
    } else if (speciesId === "plant_coffea") {
      drawStem(0, -11, 4);
      plantPx(-6, -16, 5, 4, leafColor);
      plantPx(2, -17, 5, 4, leafDark);
      plantPx(-7, -10, 4, 3, leafDark);
      plantPx(3, -10, 4, 3, leafColor);
      plantPx(2, -8, 2, 2, 0xb64b4f);
      plantPx(5, -9, 2, 2, 0xb64b4f);
    } else if (speciesId === "plant_stuckyi") {
      plantPx(-8, -19, 2, 24, leafDark);
      plantPx(-5, -22, 2, 27, leafColor);
      plantPx(-2, -20, 2, 25, leafDark);
      plantPx(1, -23, 2, 28, leafColor);
      plantPx(4, -18, 2, 23, leafDark);
      plantPx(7, -20, 2, 25, leafColor);
    } else if (speciesId === "plant_sedum_burrito") {
      drawStem(-1, -8, 4, 2);
      plantPx(-8, -20, 5, 4, 0x9fcdc0);
      plantPx(-3, -22, 6, 4, 0xa9d8cc);
      plantPx(3, -20, 5, 4, 0x9fcfc2);
      plantPx(-8, -16, 6, 4, 0x93c3b7);
      plantPx(-1, -16, 5, 4, 0xa9d8cc);
      plantPx(4, -15, 5, 4, 0x95c6b9);
      plantPx(-4, -12, 6, 3, 0x8fbeaf);
    } else {
      drawStem(0, -10, 4);
      plantPx(-4, -5, 4, 2, leafColor);
      plantPx(1, -5, 4, 2, leafDark);
      plantPx(-4, -18, 8, 6, bloomColor);
      plantPx(-2, -16, 4, 2, bloomLight, 0.84);
    }
    plantPx(-1, 3, 2, 2, shiftColor(stemColor, -8), 0.8);
    plantLayer.add(plantGraphics);
    plantLayer.setScale(plantScale);

    const swaySeed = Array.from(`${slotId}:${speciesId}`).reduce((sum, ch, index) => sum + ch.charCodeAt(0) * (index + 1), 0);
    const swayAngle = 0.8 + (swaySeed % 4) * 0.18;
    const swayDuration = 1900 + (swaySeed % 5) * 170;
    const swayOffsetX = 0.45 + (swaySeed % 3) * 0.15;
    plantLayer.setAngle(-swayAngle);
    plantLayer.setX(-swayOffsetX);
    this.tweens.add({
      targets: plantLayer,
      angle: swayAngle,
      x: swayOffsetX,
      duration: swayDuration,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
      delay: swaySeed % 180
    });
  }

  private renderDecorPotShelvesOverlay(panel: Phaser.GameObjects.Container): void {
    const shelfSpecs: Array<{ x: number; y: number; width: number; legHeight: number; slotCount: number }> = [
      { x: 74, y: 224, width: 128, legHeight: 30, slotCount: 2 },
      { x: 74, y: 382, width: 140, legHeight: 32, slotCount: 2 },
      { x: 316, y: 224, width: 128, legHeight: 30, slotCount: 2 },
      { x: 316, y: 382, width: 140, legHeight: 32, slotCount: 2 },
      { x: 195, y: 500, width: 194, legHeight: 34, slotCount: 3 }
    ];

    shelfSpecs.forEach(({ x, y, width, legHeight, slotCount }) => {
      const legOffset = Math.max(22, Math.min(70, width * 0.33));
      const topPlank = this.add
        .rectangle(x, y, width, 10, 0x8f6744, 0.98)
        .setStrokeStyle(2, 0x5f3f28, 0.88);
      const frontLip = this.add.rectangle(x, y + 5, width - 4, 3, 0x5a3b25, 0.52);
      const topHighlight = this.add.rectangle(x, y - 3, width - 8, 3, 0xcba575, 0.54);
      const surfaceLine = this.add.rectangle(x, y + 1, width - 14, 2, 0xf4dbc0, 0.24);
      const brace = this.add.rectangle(x, y + 14, width * 0.62, 3, 0x456f5b, 0.66);
      const legLeft = this.add
        .rectangle(x - legOffset, y + 17, 9, legHeight, 0x2f5847, 0.95)
        .setStrokeStyle(1, 0x1d3a2f, 0.78);
      const legRight = this.add
        .rectangle(x + legOffset, y + 17, 9, legHeight, 0x2f5847, 0.95)
        .setStrokeStyle(1, 0x1d3a2f, 0.78);
      const legBeam = this.add.rectangle(x, y + 17, width * 0.7, 2, 0x355a49, 0.58);
      const shadow = this.add.ellipse(x, y + legHeight + 16, width * 0.82, 12, 0x000000, 0.14);
      panel.add([shadow, legLeft, legRight, legBeam, brace, topPlank, frontLip, topHighlight, surfaceLine]);

      const slotStep = slotCount <= 1 ? 0 : width / (slotCount + 0.85);
      for (let index = 0; index < slotCount; index += 1) {
        const offset = (index - (slotCount - 1) * 0.5) * slotStep;
        panel.add(this.add.circle(x + offset, y - 1, 3, 0xead5ba, 0.44));
        panel.add(this.add.ellipse(x + offset, y + 3, 16, 6, 0x3d5f4e, 0.14));
      }
    });
  }

  private getDecorStageBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    cellWidth: number;
    cellHeight: number;
    rowGap: number;
    rowPitch: number;
  } {
    const left = DECOR_STAGE_CENTER_X - DECOR_STAGE_WIDTH / 2;
    const top = DECOR_STAGE_CENTER_Y - DECOR_STAGE_HEIGHT / 2;
    const rowGap = DECOR_GRID_ROW_GAP;
    const usableHeight = DECOR_STAGE_HEIGHT - rowGap * (DECOR_GRID_ROWS - 1);
    const cellHeight = usableHeight / DECOR_GRID_ROWS;
    return {
      left,
      right: left + DECOR_STAGE_WIDTH,
      top,
      bottom: top + DECOR_STAGE_HEIGHT,
      cellWidth: DECOR_STAGE_WIDTH / DECOR_GRID_COLS,
      cellHeight,
      rowGap,
      rowPitch: cellHeight + rowGap
    };
  }

  private renderDecorPlacementGrid(panel: Phaser.GameObjects.Container): void {
    const { left, top, right, bottom, cellWidth, cellHeight, rowPitch } = this.getDecorStageBounds();

    for (let row = 0; row < DECOR_GRID_ROWS; row += 1) {
      for (let col = 0; col < DECOR_GRID_COLS; col += 1) {
        const centerX = left + cellWidth * (col + 0.5);
        const centerY = top + cellHeight * 0.5 + row * rowPitch;
        panel.add(
          this.add
            .rectangle(centerX, centerY, Math.max(8, cellWidth - 4), Math.max(8, cellHeight - 4), 0xe9fff1, 0.14)
            .setStrokeStyle(1, 0x4b6f57, 0.42)
        );
      }
    }

    const gridLines = this.add.graphics();
    gridLines.lineStyle(1.5, 0x3f5d48, 0.5);
    for (let col = 0; col <= DECOR_GRID_COLS; col += 1) {
      const x = left + col * cellWidth;
      gridLines.beginPath();
      gridLines.moveTo(x, top);
      gridLines.lineTo(x, bottom);
      gridLines.strokePath();
    }
    for (let row = 0; row < DECOR_GRID_ROWS; row += 1) {
      const y = top + row * rowPitch;
      gridLines.beginPath();
      gridLines.moveTo(left, y);
      gridLines.lineTo(right, y);
      gridLines.strokePath();
    }
    gridLines.beginPath();
    gridLines.moveTo(left, bottom);
    gridLines.lineTo(right, bottom);
    gridLines.strokePath();
    panel.add(gridLines);
  }

  private getNearestDecorGridPoint(x: number, y: number): { x: number; y: number } {
    const { left, right, top, bottom, cellWidth, cellHeight, rowPitch } = this.getDecorStageBounds();
    const clampedX = Phaser.Math.Clamp(x, left, right);
    const clampedY = Phaser.Math.Clamp(y, top, bottom);
    const col = Phaser.Math.Clamp(
      Math.round((clampedX - (left + cellWidth * 0.5)) / cellWidth),
      0,
      DECOR_GRID_COLS - 1
    );
    const row = Phaser.Math.Clamp(
      Math.round((clampedY - (top + cellHeight * 0.5)) / rowPitch),
      0,
      DECOR_GRID_ROWS - 1
    );
    return {
      x: Math.round(left + cellWidth * (col + 0.5)),
      y: Math.round(top + cellHeight * 0.5 + row * rowPitch)
    };
  }

  private renderDecorPlacementItem(parent: Phaser.GameObjects.Container, item: DecorPlacement): void {
    const container = this.add.container(item.x, item.y);
    const isSelected = this.selectedDecorItemId === item.id;
    const stageBounds = this.getDecorStageBounds();

    if (item.itemType === "flower") {
      const species = PLANT_BY_ID[item.refId];
      if (!species) {
        container.destroy();
        return;
      }
      const stemColor = hexToNumber(species.stemColorHex);
      const bloomColor = hexToNumber(species.bloomColorHex);
      const flowerVisual = this.add.container(0, -12);
      flowerVisual.add(this.add.rectangle(0, -20, 5, 42, stemColor));
      flowerVisual.add(this.add.circle(-10, -10, 6, 0x86b865));
      flowerVisual.add(this.add.circle(10, -11, 6, 0x86b865));
      flowerVisual.add(this.add.circle(-6, -24, 5, 0x90c56f, 0.92));
      flowerVisual.add(this.add.circle(6, -25, 5, 0x90c56f, 0.92));
      flowerVisual.add(this.add.circle(0, -48, 14, bloomColor));
      flowerVisual.add(this.add.circle(-12, -46, 8, bloomColor, 0.9));
      flowerVisual.add(this.add.circle(12, -46, 8, bloomColor, 0.9));
      container.add(flowerVisual);
    } else {
      const pot = POT_BY_ID[item.refId];
      if (!pot) {
        container.destroy();
        return;
      }
      const renderedPotImage = this.addPotPreviewImage(container, pot.id, 0, 8, 66, 66);
      if (!renderedPotImage) {
        container.add(this.add.ellipse(0, 10, 66, 28, hexToNumber(pot.colorHex), 1).setStrokeStyle(2, hexToNumber(pot.rimHex)));
        container.add(this.add.ellipse(0, 2, 70, 12, hexToNumber(pot.rimHex), 0.72));
      }
    }

    if (isSelected) {
      container.add(this.add.rectangle(0, 2, 78, 76).setStrokeStyle(2, 0xc17b35));
    }

    container.setSize(84, 84);
    container.setInteractive({ useHandCursor: true });
    this.input.setDraggable(container);
    container.on("pointerdown", () => {
      this.selectedDecorItemId = item.id;
      this.renderMain();
    });
    container.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = Phaser.Math.Clamp(dragX, stageBounds.left, stageBounds.right);
      container.y = Phaser.Math.Clamp(dragY, stageBounds.top, stageBounds.bottom);
    });
    container.on("dragend", () => {
      const snappedPoint = this.getNearestDecorGridPoint(container.x, container.y);
      container.x = snappedPoint.x;
      container.y = snappedPoint.y;
      this.persistDecorItemPosition(item.id, container.x, container.y);
    });

    parent.add(container);
  }

  private getAvailableDecorFlowerIds(): string[] {
    return AVAILABLE_PLANT_SPECIES_DEFS.map((species) => species.id).filter(
      (speciesId) =>
        Boolean(PLANT_BY_ID[speciesId]) &&
        this.getDecorDisplayFlowerCount(speciesId) > 0 &&
        !this.isSpeciesPlacedInDecorDisplay(speciesId)
    );
  }

  private getOwnedDecorPotIds(data: SaveDataV1 = this.saveData): string[] {
    if (POT_BY_ID.pot_clay) {
      return ["pot_clay"];
    }
    return Array.from(new Set(data.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId])))).slice(0, 1);
  }

  private getDecorEditableFlowerIds(slotId: string | null = this.selectedDecorSlotId): string[] {
    const availableFlowerIds = this.getAvailableDecorFlowerIds();
    if (!slotId) {
      return availableFlowerIds;
    }
    const slotState = this.getDecorDisplaySlotState(slotId);
    const slotSpeciesId = slotState?.speciesId;
    if (slotSpeciesId && PLANT_BY_ID[slotSpeciesId] && !availableFlowerIds.includes(slotSpeciesId)) {
      return [slotSpeciesId, ...availableFlowerIds];
    }
    return availableFlowerIds;
  }

  private getDecorEditableFlowerIdsByCategory(
    category: SpeciesGroupCategory,
    slotId: string | null = this.selectedDecorSlotId
  ): string[] {
    return this.getDecorEditableFlowerIds(slotId).filter((speciesId) => getSpeciesGroupForSpecies(speciesId) === category);
  }

  private getPotShelfSideByPosition(x: number, y: number): "left" | "right" | null {
    if (y < 260 || y > 460) {
      return null;
    }
    if (x >= 6 && x <= 142) {
      return "left";
    }
    if (x >= 248 && x <= 384) {
      return "right";
    }
    return null;
  }

  private getSideShelfSlots(side: "left" | "right"): Array<{ x: number; y: number }> {
    if (side === "left") {
      return [
        { x: 74, y: 296 },
        { x: 74, y: 424 }
      ];
    }
    return [
      { x: 316, y: 296 },
      { x: 316, y: 424 }
    ];
  }

  private getNearestShelfSlotIndex(side: "left" | "right", x: number, y: number): number {
    const slots = this.getSideShelfSlots(side);
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      const distance = Math.abs(slot.y - y) + Math.abs(slot.x - x) * 0.7;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    return nearestIndex;
  }

  private getOccupiedShelfSlotIndexes(
    items: DecorPlacement[],
    side: "left" | "right",
    excludeItemId?: string
  ): Set<number> {
    const occupiedIndexes = new Set<number>();
    for (const item of items) {
      if (item.itemType !== "pot") {
        continue;
      }
      if (excludeItemId && item.id === excludeItemId) {
        continue;
      }
      const itemSide = this.getPotShelfSideByPosition(item.x, item.y);
      if (itemSide !== side) {
        continue;
      }
      occupiedIndexes.add(this.getNearestShelfSlotIndex(side, item.x, item.y));
    }
    return occupiedIndexes;
  }

  private getAvailableShelfSlotForSide(
    side: "left" | "right",
    targetY: number,
    items: DecorPlacement[],
    excludeItemId?: string
  ): { x: number; y: number } | null {
    const slots = this.getSideShelfSlots(side);
    const occupiedIndexes = this.getOccupiedShelfSlotIndexes(items, side, excludeItemId);
    const availableSlots = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ index }) => !occupiedIndexes.has(index));

    if (availableSlots.length === 0) {
      return null;
    }

    let selected = availableSlots[0];
    let minDistance = Math.abs(selected.slot.y - targetY);
    for (const candidate of availableSlots.slice(1)) {
      const distance = Math.abs(candidate.slot.y - targetY);
      if (distance < minDistance) {
        minDistance = distance;
        selected = candidate;
      }
    }

    return selected.slot;
  }

  private ensureDecorSelections(): void {
    this.decorPageIndex = Phaser.Math.Clamp(this.decorPageIndex, 0, DECOR_DISPLAY_PAGE_COUNT - 1);
    const flowerIds = this.getDecorEditableFlowerIds(this.isDecorEditMode ? this.selectedDecorSlotId : null);
    if (flowerIds.length > 0 && !flowerIds.includes(this.selectedDecorFlowerId)) {
      this.selectedDecorFlowerId = flowerIds[0];
    } else if (flowerIds.length === 0) {
      this.selectedDecorFlowerId = "";
    }
    const potIds = this.getOwnedDecorPotIds();
    if (potIds.length > 0 && !potIds.includes(this.selectedDecorPotId)) {
      this.selectedDecorPotId = potIds[0];
    } else if (potIds.length === 0) {
      this.selectedDecorPotId = "";
    }

    this.pendingDecorPlacementType = null;
    this.selectedDecorItemId = null;
    if (this.selectedDecorSlotId && !this.getActiveDecorDisplaySlots().some((slot) => slot.slotId === this.selectedDecorSlotId)) {
      this.selectedDecorSlotId = null;
    }
    if (this.isDecorEditMode && !this.selectedDecorSlotId) {
      this.selectedDecorSlotId = this.getActiveDecorDisplaySlots()[0]?.slotId ?? null;
    }
    const editableFlowerIds = this.getDecorEditableFlowerIds(this.isDecorEditMode ? this.selectedDecorSlotId : null);
    if (editableFlowerIds.length > 0 && !editableFlowerIds.includes(this.selectedDecorFlowerId)) {
      this.selectedDecorFlowerId = editableFlowerIds[0];
    }
  }

  private shiftDecorPage(step: -1 | 1): void {
    const nextPageIndex = Phaser.Math.Clamp(this.decorPageIndex + step, 0, DECOR_DISPLAY_PAGE_COUNT - 1);
    if (nextPageIndex === this.decorPageIndex) {
      return;
    }
    this.decorPageIndex = nextPageIndex;
    this.selectedDecorSlotId = null;
    this.closeDecorSlotEditModal();
    this.renderMain();
  }

  private shiftDecorFlower(step: -1 | 1): void {
    const flowerIds = this.isDecorEditMode
      ? this.getDecorEditableFlowerIdsByCategory(this.decorEditFlowerCategoryFilter, this.selectedDecorSlotId)
      : this.getDecorEditableFlowerIds(null);
    if (flowerIds.length <= 1) {
      this.showToast("변경 가능한 식물이 없습니다.");
      return;
    }
    const currentIndex = Math.max(0, flowerIds.indexOf(this.selectedDecorFlowerId));
    const nextIndex = (currentIndex + step + flowerIds.length) % flowerIds.length;
    const nextFlowerId = flowerIds[nextIndex];
    if (!nextFlowerId || nextFlowerId === this.selectedDecorFlowerId) {
      this.showToast("변경 가능한 식물이 없습니다.");
      return;
    }
    this.selectedDecorFlowerId = nextFlowerId;
    this.refreshDecorSlotEditModalIfOpen();
  }

  private shiftDecorPot(step: -1 | 1): void {
    const potIds = this.getOwnedDecorPotIds();
    if (potIds.length <= 1) {
      this.showToast("보유 화분이 1종이라 변경할 수 없습니다.");
      return;
    }
    const currentIndex = Math.max(0, potIds.indexOf(this.selectedDecorPotId));
    const nextIndex = (currentIndex + step + potIds.length) % potIds.length;
    const nextPotId = potIds[nextIndex];
    if (!nextPotId || nextPotId === this.selectedDecorPotId) {
      this.showToast("변경 가능한 화분이 없습니다.");
      return;
    }
    this.selectedDecorPotId = nextPotId;
    this.refreshDecorSlotEditModalIfOpen();
  }

  private addDecorComboWithPosition(targetX?: number, targetY?: number): boolean {
    const selectedFlowerId = this.selectedDecorFlowerId;
    const selectedPotId = this.selectedDecorPotId;
    const selectedFlowerName = PLANT_BY_ID[selectedFlowerId]?.nameKo ?? "꽃";
    const selectedPotName = POT_BY_ID[selectedPotId]?.nameKo ?? "화분";

    return this.applyMutation(
      (draft) => {
        if (!selectedFlowerId || !selectedPotId) {
          return false;
        }
        if (!draft.collection.discoveredSpeciesIds.includes(selectedFlowerId)) {
          return false;
        }
        if (!draft.collection.ownedPotIds.includes(selectedPotId)) {
          return false;
        }

        const defaultPotX =
          targetX === undefined ? DECOR_STAGE_CENTER_X + Phaser.Math.Between(-120, 120) : Math.floor(targetX);
        const defaultPotY =
          targetY === undefined ? DECOR_STAGE_CENTER_Y + Phaser.Math.Between(-130, 130) : Math.floor(targetY);
        const snappedPotPoint = this.getNearestDecorGridPoint(defaultPotX, defaultPotY);
        const snappedFlowerPoint = { x: snappedPotPoint.x, y: snappedPotPoint.y };

        const nextPotId = `decor-${draft.decor.nextItemId}`;
        draft.decor.items.push({
          id: nextPotId,
          itemType: "pot",
          refId: selectedPotId,
          x: snappedPotPoint.x,
          y: snappedPotPoint.y
        });
        draft.decor.nextItemId += 1;

        const nextFlowerId = `decor-${draft.decor.nextItemId}`;
        draft.decor.items.push({
          id: nextFlowerId,
          itemType: "flower",
          refId: selectedFlowerId,
          x: snappedFlowerPoint.x,
          y: snappedFlowerPoint.y
        });
        draft.decor.nextItemId += 1;
        this.selectedDecorItemId = nextFlowerId;
        return true;
      },
      `${selectedFlowerName} + ${selectedPotName} 배치 추가`,
      "꽃과 화분을 모두 선택해야 배치할 수 있습니다."
    );
  }

  private addDecorItem(itemType: "flower" | "pot"): void {
    this.addDecorItemWithPosition(itemType);
  }

  private addDecorItemWithPosition(itemType: "flower" | "pot", targetX?: number, targetY?: number): boolean {
    return this.applyMutation(
      (draft) => {
        const refId = itemType === "flower" ? this.selectedDecorFlowerId : this.selectedDecorPotId;
        if (!refId) {
          return false;
        }

        if (itemType === "flower" && !draft.collection.discoveredSpeciesIds.includes(refId)) {
          return false;
        }
        if (itemType === "pot" && !draft.collection.ownedPotIds.includes(refId)) {
          return false;
        }

        const stageBounds = this.getDecorStageBounds();
        const defaultTargetX =
          targetX === undefined ? DECOR_STAGE_CENTER_X + Phaser.Math.Between(-120, 120) : Math.floor(targetX);
        const defaultTargetY =
          targetY === undefined ? DECOR_STAGE_CENTER_Y + Phaser.Math.Between(-130, 130) : Math.floor(targetY);
        let draftTargetX = defaultTargetX;
        let draftTargetY = defaultTargetY;
        const snappedPoint = this.getNearestDecorGridPoint(
          Phaser.Math.Clamp(defaultTargetX, stageBounds.left, stageBounds.right),
          Phaser.Math.Clamp(defaultTargetY, stageBounds.top, stageBounds.bottom)
        );
        draftTargetX = snappedPoint.x;
        draftTargetY = snappedPoint.y;

        const nextId = `decor-${draft.decor.nextItemId}`;
        draft.decor.items.push({
          id: nextId,
          itemType,
          refId,
          x: Math.floor(draftTargetX),
          y: Math.floor(draftTargetY)
        });
        draft.decor.nextItemId += 1;
        this.selectedDecorItemId = nextId;
        return true;
      },
      itemType === "flower" ? "꽃 배치 추가" : "화분 배치 추가",
      "배치할 아이템이 없습니다."
    );
  }

  private persistDecorItemPosition(itemId: string, x: number, y: number): void {
    const item = this.saveData.decor.items.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }
    const snappedPoint = this.getNearestDecorGridPoint(x, y);
    item.x = snappedPoint.x;
    item.y = snappedPoint.y;
    this.saveData.player.lastActiveAt = Date.now();
    this.saveRepository.saveDebounced(this.saveData);
  }

  private removeSelectedDecorItem(): void {
    if (!this.selectedDecorItemId) {
      this.showToast("삭제할 아이템을 선택하세요.");
      return;
    }

    const selectedId = this.selectedDecorItemId;
    this.applyMutation(
      (draft) => {
        const previousLength = draft.decor.items.length;
        draft.decor.items = draft.decor.items.filter((item) => item.id !== selectedId);
        if (draft.decor.items.length === previousLength) {
          return false;
        }
        this.selectedDecorItemId = null;
        return true;
      },
      "선택 배치 아이템을 삭제했습니다.",
      "삭제할 아이템을 찾지 못했습니다."
    );
  }

  private clearDecorItems(): void {
    const cleared = this.applyMutation(
      (draft) => {
        if (draft.decor.items.length === 0) {
          return false;
        }
        draft.decor.items = [];
        this.selectedDecorItemId = null;
        return true;
      },
      undefined,
      "초기화할 배치 아이템이 없습니다."
    );

    if (cleared) {
      this.showToast("배치를 초기화했습니다", "center");
    }
  }

  private renderCollectionPanel(): void {
    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);
    const isPixelStyleMode = false;

    this.renderBasicUiBackground(panel);
    panel.add(this.add.rectangle(195, 54, 356, 72, 0xfff8eb, 0.93).setStrokeStyle(2, 0xc8bda3, 0.92));

    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_TITLE_Y + 5, "식물 도감", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: TAB_TITLE_FONT_SIZE,
          color: "#384638",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    const collectionSubtitle =
      this.collectionCategory === "set"
        ? "세트 보상을 확인하고 수령하세요."
        : "도감 카드를 탭하면 상세 정보가 열립니다.";
    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_SUBTITLE_Y + 5, collectionSubtitle, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#6f7667"
        })
        .setOrigin(0, 0)
    );

    const collectionTabCount = COLLECTION_CATEGORY_ORDER.length;
    const horizontalPadding = 20;
    const tabGap = 8;
    const totalUsableWidth = 390 - horizontalPadding * 2;
    const tabButtonWidth = Math.floor((totalUsableWidth - tabGap * (collectionTabCount - 1)) / collectionTabCount);
    const tabStartX = horizontalPadding + tabButtonWidth / 2;
    const collectionTopTabOffsetY = -25;

    COLLECTION_CATEGORY_ORDER.forEach((category, index) => {
      const isActive = this.collectionCategory === category;
      const tabCenterX = tabStartX + index * (tabButtonWidth + tabGap);
      this.addButton(
        panel,
        tabCenterX,
        SHOP_CATEGORY_Y + collectionTopTabOffsetY,
        tabButtonWidth,
        34,
        COLLECTION_CATEGORY_LABELS[category],
        () => {
          if (this.collectionCategory === category) {
            return;
          }
          this.collectionCategory = category;
          this.collectionPage = 0;
          this.selectedCollectionSpeciesId = null;
          this.renderMain();
        },
        {
          fillColor: isActive ? (isPixelStyleMode ? 0x789d69 : 0x86ac77) : isPixelStyleMode ? 0xe4dcc6 : 0xede6d4,
          strokeColor: isActive ? (isPixelStyleMode ? 0x4e7341 : 0x5e7f52) : isPixelStyleMode ? 0x9f8d6d : 0xcdbf9f,
          textColor: isActive ? "#f7f7f2" : isPixelStyleMode ? "#5b5040" : "#4f4b40",
          fontSize: 16
        }
      );
      if (category === "set" && this.hasClaimableCollectionSetReward()) {
        panel.add(
          this.add
            .circle(tabCenterX + tabButtonWidth / 2 - 12, SHOP_CATEGORY_Y + collectionTopTabOffsetY - 12, 6, 0xd94141, 1)
            .setStrokeStyle(1, 0xffffff, 0.96)
        );
      }
    });

    if (this.collectionCategory === "set") {
      this.selectedCollectionSpeciesId = null;
      this.renderCollectionSetRewardCards(panel, isPixelStyleMode);
      return;
    }

    const activeSpecies = getActiveGrowableSpecies();
    const filteredSpecies = activeSpecies
      .filter((species) => {
        const speciesGroup = getSpeciesGroupForSpecies(species.id);
        return this.collectionCategory === "flower" ? speciesGroup === "flower" : speciesGroup !== "flower";
      })
      .sort((a, b) => {
        const rarityDelta = RARITY_SORT_ORDER[a.rarity] - RARITY_SORT_ORDER[b.rarity];
        if (rarityDelta !== 0) {
          return rarityDelta;
        }
        return a.nameKo.localeCompare(b.nameKo, "ko");
      });
    const totalPage = Math.max(1, Math.ceil(filteredSpecies.length / COLLECTION_PAGE_SIZE));
    this.collectionPage = Phaser.Math.Clamp(this.collectionPage, 0, totalPage - 1);

    const pageItems = filteredSpecies.slice(
      this.collectionPage * COLLECTION_PAGE_SIZE,
      this.collectionPage * COLLECTION_PAGE_SIZE + COLLECTION_PAGE_SIZE
    );

    if (pageItems.length === 0) {
      panel.add(
        this.add
          .text(195, 332, "해당 카테고리 식물이 아직 없습니다.", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "14px",
            color: "#7b7768"
          })
          .setOrigin(0.5)
      );
    }

    pageItems.forEach((species, localIndex) => {
      const y = SHOP_ITEM_BASE_Y + localIndex * 115;
      const contentY = y - 10;
      const discovered = this.saveData.collection.discoveredSpeciesIds.includes(species.id);
      const cardFill = isPixelStyleMode ? 0xfff2dd : 0xfff8eb;
      const cardStroke = isPixelStyleMode ? 0xb79f79 : 0xd7ccb5;
      const imageFrameStroke = discovered ? (isPixelStyleMode ? 0x8f9f74 : 0xa2ad89) : isPixelStyleMode ? 0x8f8570 : 0xa49d89;
      const titleColor = isPixelStyleMode ? "#4b3f2f" : "#3f453c";
      const descColor = isPixelStyleMode ? "#5f5443" : "#605f55";

      const card = this.add
        .rectangle(195, y, 350, 101, cardFill, 0.985)
        .setStrokeStyle(2, cardStroke, 0.95)
        .setInteractive({ useHandCursor: true });
      card.on("pointerup", () => {
        if (!discovered) {
          this.showToast("아직 발견하지 못한 식물입니다.");
          return;
        }
        this.selectedCollectionSpeciesId = species.id;
        this.renderMain();
      });
      panel.add(card);
      if (isPixelStyleMode) {
        panel.add(this.add.rectangle(195, y - 47, 338, 4, 0xffffff, 0.22));
      }

      panel.add(
        this.add.rectangle(64, contentY + 9, 58, 58, cardFill, 0.98).setStrokeStyle(2, imageFrameStroke, 0.98)
      );
      if (discovered) {
        const cutoutTextureKey = getCollectionFlowerCutoutTextureKey(species.id);
        const sourceTextureKey = getCollectionFlowerTextureKey(species.id);
        if (this.textures.exists(cutoutTextureKey)) {
          this.addContainedImage(panel, cutoutTextureKey, 64, contentY + 9, 50, 50);
        } else if (this.textures.exists(sourceTextureKey)) {
          this.addContainedImage(panel, sourceTextureKey, 64, contentY + 9, 50, 50);
        } else {
          panel.add(
            this.add
              .text(64, contentY + 9, "IMG", {
                fontFamily: "Pretendard, sans-serif",
                fontSize: "10px",
                color: "#7f7b6e",
                fontStyle: "700"
              })
              .setOrigin(0.5)
          );
        }
      } else if (this.textures.exists(UNKNOWN_FLOWER_TEXTURE_KEY)) {
        panel.add(this.add.image(64, contentY + 9, UNKNOWN_FLOWER_TEXTURE_KEY).setDisplaySize(50, 50));
      } else {
        panel.add(
          this.add
            .text(64, contentY + 9, "?", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "16px",
              color: "#7f7f7b",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }

      const cardNameText = this.add
        .text(112, contentY - 22, discovered ? species.nameKo : "미발견 식물", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "20px",
          color: titleColor,
          fontStyle: "700"
        })
        .setOrigin(0, 0);
      panel.add(cardNameText);

      panel.add(
        this.add
          .text(112, contentY + 7, discovered ? species.descriptionKo : `랜덤 개화에서 등장할 수 있습니다.\n첫 수확 시 도감에 등록됩니다.`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: descColor,
            lineSpacing: 3,
            wordWrap: { width: 212 }
          })
          .setOrigin(0, 0)
      );

      if (discovered) {
        const cardRarityX = Math.min(338, 112 + cardNameText.width + 10) - 7;
        panel.add(
          this.add
            .text(cardRarityX, contentY - 17, RARITY_LABELS[species.rarity], {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "13px",
              color: "#557055",
              fontStyle: "700"
            })
            .setOrigin(0, 0)
        );
        panel.add(
          this.add
            .text(338, contentY + 38, "상세 보기", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: "#7a6b47",
              fontStyle: "700"
            })
            .setOrigin(1, 0)
        );
      }
    });

    this.addButton(
      panel,
      112,
      SHOP_FOOTER_Y,
      88,
      34,
      "이전",
      () => {
        this.collectionPage = Phaser.Math.Clamp(this.collectionPage - 1, 0, totalPage - 1);
        this.renderMain();
      },
      {
        enabled: this.collectionPage > 0,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );

    panel.add(
      this.add
        .text(195, SHOP_FOOTER_Y, `${this.collectionPage + 1} / ${totalPage}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#5e6a5c"
        })
        .setOrigin(0.5)
    );

    this.addButton(
      panel,
      278,
      SHOP_FOOTER_Y,
      88,
      34,
      "다음",
      () => {
        this.collectionPage = Phaser.Math.Clamp(this.collectionPage + 1, 0, totalPage - 1);
        this.renderMain();
      },
      {
        enabled: this.collectionPage < totalPage - 1,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );

    this.renderCollectionDetailModal(panel);
  }

  private renderCollectionSetRewardCards(panel: Phaser.GameObjects.Container, isPixelStyleMode: boolean): void {
    const totalPage = Math.max(1, Math.ceil(COLLECTION_SET_REWARD_DEFS.length / COLLECTION_SET_PAGE_SIZE));
    this.collectionPage = Phaser.Math.Clamp(this.collectionPage, 0, totalPage - 1);
    const pageSets = COLLECTION_SET_REWARD_DEFS.slice(
      this.collectionPage * COLLECTION_SET_PAGE_SIZE,
      this.collectionPage * COLLECTION_SET_PAGE_SIZE + COLLECTION_SET_PAGE_SIZE
    );

    pageSets.forEach((setDef, localIndex) => {
      const y = SHOP_ITEM_BASE_Y + localIndex * 115;
      const completionCount = this.getCollectionSetCompletionCount(setDef);
      const targetCount = setDef.speciesIds.length;
      const isClaimed = this.hasClaimedCollectionSetReward(setDef.id);
      const canClaim = this.canClaimCollectionSetReward(setDef);
      const progressRatio = targetCount > 0 ? completionCount / targetCount : 0;
      const requiredSpeciesNames = setDef.speciesIds.map((speciesId) => PLANT_BY_ID[speciesId]?.nameKo ?? speciesId);
      const requiredFirstLine = requiredSpeciesNames.slice(0, 3).join(", ");
      const requiredSecondLine = requiredSpeciesNames.slice(3).join(", ");
      const memberPreview = requiredSecondLine
        ? `필요 : ${requiredFirstLine},\n${requiredSecondLine}`
        : `필요 : ${requiredFirstLine}`;

      panel.add(
        this.add
          .rectangle(195, y, 350, 101, isPixelStyleMode ? 0xfff2dd : 0xfff8eb, 0.985)
          .setStrokeStyle(2, isPixelStyleMode ? 0xb79f79 : 0xd7ccb5, 0.95)
      );
      if (isPixelStyleMode) {
        panel.add(this.add.rectangle(195, y - 47, 338, 4, 0xffffff, 0.22));
      }
      panel.add(
        this.add
          .text(30, y - 35, setDef.titleKo, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "17px",
            color: "#3f453c",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );
      panel.add(
        this.add
          .text(30, y - 16, `수확 진행 ${completionCount}/${targetCount} · ${Math.round(progressRatio * 100)}%`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#5b6650",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );
      panel.add(
        this.add
          .text(30, y + 1, `보상 코인 +${setDef.rewardCoins} · 랜덤 씨앗 +${setDef.rewardSeeds}`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#6b6456",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );
      panel.add(
        this.add
          .text(30, y + 17, memberPreview, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "11px",
            color: "#6b6456",
            wordWrap: { width: 214 }
          })
          .setOrigin(0, 0)
      );
      const claimButtonY = y - 6;
      this.addButton(
        panel,
        300,
        claimButtonY,
        86,
        26,
        isClaimed ? "완료" : canClaim ? "수령" : "대기",
        () => {
          this.claimCollectionSetReward(setDef.id);
        },
        {
          enabled: canClaim,
          fillColor: 0x6a9052,
          strokeColor: 0x4f6e3e,
          textColor: "#ffffff",
          fontSize: 12
        }
      );
      if (canClaim) {
        const dotX = 300 + 86 / 2 - 3;
        const dotY = claimButtonY - 26 / 2 - 2;
        panel.add(this.add.circle(dotX, dotY, 7, 0xd94141, 1).setStrokeStyle(1, 0xffffff, 0.95));
        panel.add(
          this.add
            .text(dotX, dotY, "!", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "10px",
              color: "#ffffff",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }
    });

    if (pageSets.length === 0) {
      panel.add(
        this.add
          .text(195, 332, "세트 정보가 아직 없습니다.", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "14px",
            color: "#7b7768"
          })
          .setOrigin(0.5)
      );
    }

    this.addButton(
      panel,
      112,
      SHOP_FOOTER_Y,
      88,
      34,
      "이전",
      () => {
        this.collectionPage = Phaser.Math.Clamp(this.collectionPage - 1, 0, totalPage - 1);
        this.renderMain();
      },
      {
        enabled: this.collectionPage > 0,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );

    panel.add(
      this.add
        .text(195, SHOP_FOOTER_Y, `${this.collectionPage + 1} / ${totalPage}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#5e6a5c"
        })
        .setOrigin(0.5)
    );

    this.addButton(
      panel,
      278,
      SHOP_FOOTER_Y,
      88,
      34,
      "다음",
      () => {
        this.collectionPage = Phaser.Math.Clamp(this.collectionPage + 1, 0, totalPage - 1);
        this.renderMain();
      },
      {
        enabled: this.collectionPage < totalPage - 1,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );
  }

  private renderCollectionDetailModal(panel: Phaser.GameObjects.Container): void {
    if (!this.selectedCollectionSpeciesId) {
      return;
    }

    if (!this.saveData.collection.discoveredSpeciesIds.includes(this.selectedCollectionSpeciesId)) {
      this.selectedCollectionSpeciesId = null;
      return;
    }

    const species = PLANT_BY_ID[this.selectedCollectionSpeciesId];
    if (!species) {
      this.selectedCollectionSpeciesId = null;
      return;
    }

    const scrim = this.add
      .rectangle(195, MAIN_HEIGHT / 2, 390, MAIN_HEIGHT, 0x1e261f, 0.56)
      .setInteractive({ useHandCursor: true });
    scrim.on("pointerup", () => {
      this.selectedCollectionSpeciesId = null;
      this.renderMain();
    });
    panel.add(scrim);

    panel.add(this.add.rectangle(195, 305.5, 336, 445, 0xf2e8d4, 0.99).setStrokeStyle(2, 0xb79f79));
    this.addCollectionCloseButton(panel, 328, 106, () => {
      this.selectedCollectionSpeciesId = null;
      this.renderMain();
    });

    const detailBlockShiftY = 16;

    const detailImageAreaCenterX = 195;
    const detailImageAreaCenterY = 213 + detailBlockShiftY;
    const detailImageAreaWidth = 304;
    const detailImageAreaHeight = 194;
    panel.add(
      this.add
        .rectangle(detailImageAreaCenterX, detailImageAreaCenterY, detailImageAreaWidth, detailImageAreaHeight, 0xfff8eb, 0.95)
        .setStrokeStyle(2, 0xd2c0a0)
    );
    const detailCutoutTextureKey = getCollectionFlowerCutoutTextureKey(species.id);
    const detailSourceTextureKey = getCollectionFlowerTextureKey(species.id);
    const isStuckyiDetail = species.id === "plant_stuckyi";
    const isFlowerSpeciesDetail = getSpeciesGroupForSpecies(species.id) === "flower";
    const blossomZoomDetailBySpeciesId: Record<
      string,
      { cropWidthRatio: number; cropHeightRatio: number; cropYOffsetRatio: number; maxWidth: number; maxHeight: number; offsetY: number }
    > = {
      plant_gerbera: { cropWidthRatio: 0.76, cropHeightRatio: 0.58, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_coquelicot: { cropWidthRatio: 0.78, cropHeightRatio: 0.62, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_tulip: { cropWidthRatio: 0.72, cropHeightRatio: 0.66, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 53 },
      plant_pansy: { cropWidthRatio: 0.76, cropHeightRatio: 0.62, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_freesia: { cropWidthRatio: 0.78, cropHeightRatio: 0.66, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 53 },
      plant_chrysanthemum: { cropWidthRatio: 0.76, cropHeightRatio: 0.6, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_lisianthus: { cropWidthRatio: 0.76, cropHeightRatio: 0.6, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_peony_blossom: { cropWidthRatio: 0.76, cropHeightRatio: 0.6, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_sunflower: { cropWidthRatio: 0.78, cropHeightRatio: 0.6, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_camellia: { cropWidthRatio: 0.76, cropHeightRatio: 0.62, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 },
      plant_canna_lily: { cropWidthRatio: 0.74, cropHeightRatio: 0.64, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 46 },
      plant_carnation: { cropWidthRatio: 0.74, cropHeightRatio: 0.62, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 49 },
      plant_rose: { cropWidthRatio: 0.76, cropHeightRatio: 0.6, cropYOffsetRatio: 0, maxWidth: 292, maxHeight: 188, offsetY: 56 }
    };
    const defaultFlowerBlossomZoom = {
      cropWidthRatio: 0.76,
      cropHeightRatio: 0.62,
      cropYOffsetRatio: 0,
      maxWidth: 292,
      maxHeight: 188,
      offsetY: 56
    };
    const detailPlacementBySpeciesId: Record<string, { maxWidth: number; maxHeight: number; offsetY: number }> = {
      plant_gerbera: { maxWidth: 294, maxHeight: 188, offsetY: 14 },
      plant_coquelicot: { maxWidth: 286, maxHeight: 186, offsetY: 14 },
      plant_tulip: { maxWidth: 286, maxHeight: 186, offsetY: 14 },
      plant_pansy: { maxWidth: 286, maxHeight: 186, offsetY: 14 },
      plant_freesia: { maxWidth: 286, maxHeight: 186, offsetY: 14 },
      plant_canna_lily: { maxWidth: 286, maxHeight: 186, offsetY: 14 },
      plant_carnation: { maxWidth: 286, maxHeight: 186, offsetY: 14 },
      plant_camellia: { maxWidth: 300, maxHeight: 192, offsetY: 14 }
    };
    const detailPlacement = detailPlacementBySpeciesId[species.id] ?? {
      maxWidth: isStuckyiDetail ? 300 : 296,
      maxHeight: isStuckyiDetail ? 188 : 190,
      offsetY: 0
    };
    const detailTextureKey = (() => {
      if (this.textures.exists(detailCutoutTextureKey)) {
        return detailCutoutTextureKey;
      }
      if (this.textures.exists(detailSourceTextureKey)) {
        return detailSourceTextureKey;
      }
      return null;
    })();

    if (detailTextureKey) {
      // Future-proof default:
      // any newly added flower species automatically uses blossom-centered crop
      // unless the species has an explicit override in blossomZoomDetailBySpeciesId.
      const blossomZoom = blossomZoomDetailBySpeciesId[species.id] ?? (isFlowerSpeciesDetail ? defaultFlowerBlossomZoom : null);
      if (blossomZoom) {
        const detailImage = this.add.image(detailImageAreaCenterX, detailImageAreaCenterY + blossomZoom.offsetY, detailTextureKey);
        const sourceWidth = Math.max(1, Math.floor(detailImage.width));
        const sourceHeight = Math.max(1, Math.floor(detailImage.height));
        const cropWidth = Phaser.Math.Clamp(Math.floor(sourceWidth * blossomZoom.cropWidthRatio), 1, sourceWidth);
        const cropHeight = Phaser.Math.Clamp(Math.floor(sourceHeight * blossomZoom.cropHeightRatio), 1, sourceHeight);
        const cropX = Math.max(0, Math.floor((sourceWidth - cropWidth) / 2));
        const requestedCropY = Math.max(0, Math.floor(sourceHeight * blossomZoom.cropYOffsetRatio));
        const cropY = Math.min(Math.max(0, sourceHeight - cropHeight), requestedCropY);
        detailImage.setCrop(cropX, cropY, cropWidth, cropHeight);
        const scale = Math.min(blossomZoom.maxWidth / cropWidth, blossomZoom.maxHeight / cropHeight);
        detailImage.setDisplaySize(
          Math.max(1, Math.floor(sourceWidth * scale)),
          Math.max(1, Math.floor(sourceHeight * scale))
        );
        panel.add(detailImage);
      } else {
        this.addContainedImage(
          panel,
          detailTextureKey,
          detailImageAreaCenterX,
          detailImageAreaCenterY + detailPlacement.offsetY,
          detailPlacement.maxWidth,
          detailPlacement.maxHeight
        );
      }
    } else {
      panel.add(
        this.add
          .text(detailImageAreaCenterX, detailImageAreaCenterY, "꽃 이미지 영역", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "14px",
            color: "#8a7d64",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
    }

    const detailNameText = this.add
      .text(195, 332 + detailBlockShiftY, species.nameKo, {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "26px",
        color: "#3c4034",
        fontStyle: "700"
      })
      .setOrigin(0.5);
    panel.add(detailNameText);
    const detailRarityX = Math.min(316, 195 + detailNameText.width * 0.5 + 10);
    panel.add(
      this.add
        .text(detailRarityX, 334 + detailBlockShiftY, RARITY_LABELS[species.rarity], {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#5d6d5a",
          fontStyle: "700"
        })
        .setOrigin(0, 0.5)
    );

    panel.add(
      this.add
        .text(195, 354 + detailBlockShiftY, species.descriptionKo, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#5e5647",
          align: "center",
          wordWrap: { width: 284 }
        })
        .setOrigin(0.5, 0)
    );

    panel.add(
      this.add
        .text(48, 385 + detailBlockShiftY, `꽃말: ${species.flowerLanguageKo}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#4e5f4d",
          fontStyle: "700",
          align: "left",
          wordWrap: { width: 284 }
        })
        .setOrigin(0, 0)
    );

    const detailText = [
      `원산지: ${species.originKo}`,
      `개화 계절: ${species.seasonKo}`,
      `성장 시간: ${formatSeconds(species.growSeconds)}`,
      `수확 보상: ${species.rewardCoins} 코인`
    ].join("\n");

    panel.add(
      this.add
        .text(48, 407 + detailBlockShiftY, detailText, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#3f4038",
          lineSpacing: 6,
          wordWrap: { width: 296 }
        })
        .setOrigin(0, 0)
    );

  }

  private renderShopPanel(): void {
    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);

    this.renderBasicUiBackground(panel);
    panel.add(this.add.rectangle(195, MAIN_HEIGHT / 2, MAIN_WIDTH, MAIN_HEIGHT, 0xfff9ee, 0.2));
    panel.add(this.add.rectangle(195, 54, 356, 72, 0xfff8eb, 0.93).setStrokeStyle(2, 0xc8bda3, 0.92));

    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_TITLE_Y + 5, "구매 상점", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: TAB_TITLE_FONT_SIZE,
          color: "#384638",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_SUBTITLE_Y + 5, "화분/배경/씨앗/보석 등을 구매할 수 있습니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#6f7667"
        })
        .setOrigin(0, 0)
    );

    const tabCount = SHOP_TAB_ORDER.length;
    const horizontalPadding = 20;
    const tabGap = 8;
    const totalUsableWidth = 390 - horizontalPadding * 2;
    const tabButtonWidth = Math.floor((totalUsableWidth - tabGap * (tabCount - 1)) / tabCount);
    const tabStartX = horizontalPadding + tabButtonWidth / 2;
    const shopTopTabOffsetY = -25;

    SHOP_TAB_ORDER.forEach((shopTab, index) => {
      const isActive = this.shopTab === shopTab;
      this.addButton(
        panel,
        tabStartX + index * (tabButtonWidth + tabGap),
        SHOP_CATEGORY_Y + shopTopTabOffsetY,
        tabButtonWidth,
        34,
        SHOP_TAB_LABELS[shopTab],
        () => {
          if (this.shopTab === shopTab) {
            return;
          }
          this.shopTab = shopTab;
          if (shopTab === "pot" || shopTab === "background") {
            this.shopPage = 0;
          }
          this.renderMain();
        },
        {
          fillColor: isActive ? 0x86ac77 : 0xede6d4,
          strokeColor: isActive ? 0x5e7f52 : 0xcdbf9f,
          textColor: isActive ? "#f7f7f2" : "#4f4b40",
          fontSize: 16
        }
      );
    });

    switch (this.shopTab) {
      case "pot":
        this.renderPotShopItems(panel);
        break;
      case "background":
        this.renderBackgroundShopItems(panel);
        break;
      case "purchase":
        this.renderShopPurchaseItems(panel);
        break;
      default:
        this.renderPotShopItems(panel);
        break;
    }
  }

  private renderAttendanceTab(): void {
    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);

    if (this.textures.exists(ATTENDANCE_BACKGROUND_TEXTURE_KEY)) {
      panel.add(this.add.image(195, MAIN_HEIGHT / 2, ATTENDANCE_BACKGROUND_TEXTURE_KEY).setDisplaySize(MAIN_WIDTH, MAIN_HEIGHT));
      panel.add(this.add.rectangle(195, MAIN_HEIGHT / 2, MAIN_WIDTH, MAIN_HEIGHT, 0xf4f0e7, 0.12));
    } else {
      panel.add(this.add.rectangle(195, MAIN_HEIGHT / 2, MAIN_WIDTH, MAIN_HEIGHT, 0xf4f0e7));
    }
    panel.add(this.add.rectangle(195, 54, 356, 72, 0xfff8eb, 0.93).setStrokeStyle(2, 0xc8bda3, 0.92));
    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_TITLE_Y, "출석", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: TAB_TITLE_FONT_SIZE,
          color: "#3b4539",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    panel.add(
      this.add
        .text(TAB_TITLE_X, TAB_SUBTITLE_Y, `매일 ${ATTENDANCE_RESET_HOUR_KST}:00 (KST) 리셋 · 7일 보상 + 초반 해금`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#5d6558"
        })
        .setOrigin(0, 0)
    );

    const claimedToday = this.hasClaimedAttendanceToday();
    const nextDay = this.getAttendanceNextDay();
    const claimedDayCount = Phaser.Math.Clamp(Math.floor(this.saveData.attendance.cycleDay), 0, 7);
    const attendanceGemIconKey = this.getAttendanceGemIconTextureKey();

    const attendanceCardWidth = 84;
    const attendanceCardHeight = 108;
    const attendanceCardOffsetY = 20;
    const attendanceCardHorizontalInset = 12;
    const attendanceCardTextureKey = this.textures.exists(ATTENDANCE_REWARD_CARD_CUTOUT_TEXTURE_KEY)
      ? ATTENDANCE_REWARD_CARD_CUTOUT_TEXTURE_KEY
      : this.textures.exists(ATTENDANCE_REWARD_CARD_TEXTURE_KEY)
        ? ATTENDANCE_REWARD_CARD_TEXTURE_KEY
        : null;
    panel.add(this.add.rectangle(195, 328 + attendanceCardOffsetY, 356, 400, 0xfff8eb, 0.9).setStrokeStyle(2, 0xc8bda3, 0.9));
    const attendanceCardPositions: Array<{ x: number; y: number }> = [
      { x: 79 + attendanceCardHorizontalInset, y: 194 + attendanceCardOffsetY },
      { x: 195, y: 194 + attendanceCardOffsetY },
      { x: 311 - attendanceCardHorizontalInset, y: 194 + attendanceCardOffsetY },
      { x: 79 + attendanceCardHorizontalInset, y: 322 + attendanceCardOffsetY },
      { x: 195, y: 322 + attendanceCardOffsetY },
      { x: 311 - attendanceCardHorizontalInset, y: 322 + attendanceCardOffsetY },
      { x: 195, y: 450 + attendanceCardOffsetY }
    ];
    const seedIconKey = this.textures.exists(SEED_DROP_TEXTURE_KEY) ? SEED_DROP_TEXTURE_KEY : SEED_ICON_TEXTURE_KEY;

    for (let day = 1; day <= 7; day += 1) {
      const position = attendanceCardPositions[day - 1];
      const centerX = position.x;
      const centerY = position.y;
      const isClaimed = day <= claimedDayCount;
      const isToday = !claimedToday && day === nextDay;
      const reward = getAttendanceRewardForDay(day);
      const unlockReward = getAttendanceUnlockRewardForDay(day);
      const isUnlockClaimed = this.saveData.attendance.unlockClaimedDays.includes(day);

      const cardFill = isClaimed ? 0xe2e3df : isToday ? 0xfff3d7 : 0xfffbef;
      const cardStroke = isClaimed ? 0x9ca09a : isToday ? 0xc9954f : 0xcabfa4;
      if (attendanceCardTextureKey) {
        const cardImage = this.add.image(centerX, centerY, attendanceCardTextureKey).setDisplaySize(attendanceCardWidth, attendanceCardHeight);
        if (isClaimed) {
          cardImage.setAlpha(0.72);
        }
        panel.add(cardImage);
      } else {
        panel.add(
          this.add
            .rectangle(centerX, centerY, attendanceCardWidth, attendanceCardHeight, cardFill, 0.99)
            .setStrokeStyle(2, cardStroke, 0.98)
        );
      }
      panel.add(
        this.add.rectangle(
          centerX,
          centerY - 40,
          attendanceCardWidth - 14,
          18,
          isClaimed ? 0xd1d3cc : isToday ? 0xf6d8a5 : 0xebe6d8,
          0.94
        )
      );
      panel.add(
        this.add
          .text(centerX, centerY - 40, `${day}일차`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "13px",
            color: isClaimed ? "#666b65" : isToday ? "#7e5a2f" : "#5f5e54",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );
      if (unlockReward) {
        panel.add(
          this.add
            .rectangle(centerX, centerY - 22, attendanceCardWidth - 12, 14, isUnlockClaimed ? 0xd6ddcf : 0xece5d1, 0.94)
            .setStrokeStyle(1, isUnlockClaimed ? 0x8ea17e : 0xb6a98d, 0.92)
        );
        panel.add(
          this.add
            .text(centerX, centerY - 22, `해금 ${unlockReward.titleKo}`, {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "9px",
              color: isUnlockClaimed ? "#4f6648" : "#6a6252",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }

      const rewardEntries: Array<{
        iconKey: string;
        amount: number;
        label: string;
        iconSize: number;
        labelOffsetY: number;
      }> = [];
      if (reward.seedCount > 0) {
        rewardEntries.push({
          iconKey: seedIconKey,
          amount: reward.seedCount,
          label: "씨앗",
          iconSize: 50,
          labelOffsetY: 30
        });
      }
      if (reward.gemCount > 0) {
        rewardEntries.push({
          iconKey: attendanceGemIconKey,
          amount: reward.gemCount,
          label: "보석",
          iconSize: 30,
          labelOffsetY: 20
        });
      }

      if (rewardEntries.length <= 0) {
        panel.add(
          this.add
            .text(centerX, centerY - 2, "보상 없음", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: "#6c6a60"
            })
            .setOrigin(0.5)
        );
      } else {
        const rewardLineSpacing = 32;
        const rewardStartY = rewardEntries.length === 1 ? centerY - 2 : centerY - 12;
        rewardEntries.forEach((entry, index) => {
          const rewardY = rewardStartY + index * rewardLineSpacing;
          const rewardIcon = this.add.image(centerX, rewardY, entry.iconKey).setDisplaySize(entry.iconSize, entry.iconSize);
          if (isClaimed) {
            rewardIcon.setAlpha(0.62);
          }
          panel.add(rewardIcon);
          panel.add(
            this.add
              .text(centerX, rewardY + entry.labelOffsetY, `x${entry.amount}`, {
                fontFamily: "Pretendard, sans-serif",
                fontSize: "13px",
                color: isClaimed ? "#676a63" : "#4f5346",
                fontStyle: "700"
              })
              .setOrigin(0.5)
          );
        });
      }

      if (isClaimed) {
        panel.add(
          this.add
            .text(centerX, centerY + 44, "수령완료", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: "#6b726b",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      } else if (isToday) {
        const claimHit = this.add.zone(centerX, centerY, attendanceCardWidth, attendanceCardHeight).setInteractive({ useHandCursor: true });
        claimHit.on("pointerup", () => {
          this.openAttendanceAdConfirmModal();
        });
        panel.add(claimHit);
      }
    }

    const unlockClaimedDaySet = new Set(this.saveData.attendance.unlockClaimedDays);
    const todayUnlockReward = getAttendanceUnlockRewardForDay(nextDay);
    const isNextDayUnlockAlreadyClaimed = unlockClaimedDaySet.has(nextDay);
    const futureUnlockStartDay = claimedToday ? nextDay : nextDay + 1;
    const upcomingUnlock = EARLY_UNLOCK_REWARDS.find(
      (reward) => reward.day >= futureUnlockStartDay && !unlockClaimedDaySet.has(reward.day)
    );
    const hasRemainingUnlock = EARLY_UNLOCK_REWARDS.some((reward) => !unlockClaimedDaySet.has(reward.day));

    panel.add(this.add.rectangle(195, 595, 352, 108, 0xfff8eb, 0.94).setStrokeStyle(2, 0xcfbf9d, 0.94));
    panel.add(
      this.add
        .text(34, 548, "초반 7일 해금 보상", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#4f6744",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );
    const todayRewardLine = claimedToday
      ? "오늘 출석 보상: 수령완료"
      : `오늘 DAY ${nextDay} 보상: ${this.getAttendanceRewardLabel(nextDay)}`;
    panel.add(
      this.add
        .text(34, 568, todayRewardLine, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#5e5a4b",
          fontStyle: "700",
          wordWrap: { width: 308 }
        })
        .setOrigin(0, 0)
    );

    const todayUnlockLine = todayUnlockReward
      ? isNextDayUnlockAlreadyClaimed
        ? `${claimedToday ? "다음" : "오늘"} 해금(${todayUnlockReward.titleKo}): 이미 수령`
        : `${claimedToday ? "다음" : "오늘"} 해금(${todayUnlockReward.titleKo}): ${this.getAttendanceUnlockRewardLabel(nextDay)}`
      : `${claimedToday ? "다음" : "오늘"} 해금: 없음`;
    panel.add(
      this.add
        .text(34, 588, todayUnlockLine, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: "#6b6456",
          fontStyle: "700",
          wordWrap: { width: 308 }
        })
        .setOrigin(0, 0)
    );

    const upcomingUnlockLine = upcomingUnlock
      ? `이후 해금 DAY ${upcomingUnlock.day}: ${upcomingUnlock.titleKo}`
      : hasRemainingUnlock
        ? "이후 해금: 없음"
        : "초반 7일 해금 보상을 모두 수령했습니다.";
    panel.add(
      this.add
        .text(34, 607, upcomingUnlockLine, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "11px",
          color: hasRemainingUnlock ? "#6b6456" : "#5e685b",
          fontStyle: "700",
          wordWrap: { width: 308 }
        })
        .setOrigin(0, 0)
    );
  }

  private getNextAttendanceResetAtMs(nowMs = Date.now()): number {
    const kstOffsetMs = KST_UTC_OFFSET_HOURS * 60 * 60 * 1000;
    const nowKstMs = nowMs + kstOffsetMs;
    const kstNow = new Date(nowKstMs);
    const resetTodayKstMs = Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate(),
      ATTENDANCE_RESET_HOUR_KST,
      0,
      0,
      0
    );
    const nextResetKstMs = nowKstMs >= resetTodayKstMs ? resetTodayKstMs + 24 * 60 * 60 * 1000 : resetTodayKstMs;
    return nextResetKstMs - kstOffsetMs;
  }

  private getAttendanceResetRemainingLabel(nowMs = Date.now()): string {
    const nextResetAtMs = this.getNextAttendanceResetAtMs(nowMs);
    const remainSeconds = Math.max(0, Math.ceil((nextResetAtMs - nowMs) / 1000));
    return `${formatSeconds(remainSeconds)} 후 출석 갱신`;
  }

  private renderHomeAttendanceOverlay(panel: Phaser.GameObjects.Container): void {
    const closeOverlay = (): void => {
      this.isHomeAttendancePanelOpen = false;
      this.renderMain();
    };
    const modalCenterX = 195;
    const modalWidth = 344;
    const modalTopY = 338 - 492 / 2;
    const modalHeight = 492 - 15;
    const modalCenterY = modalTopY + modalHeight / 2;
    const hasClaimedToday = this.hasClaimedAttendanceToday();
    const nextDay = this.getAttendanceNextDay();
    const previewDay = Phaser.Math.Clamp(Math.floor(this.attendancePreviewDay), 1, 7);
    if (this.attendancePreviewDay !== previewDay) {
      this.attendancePreviewDay = previewDay;
    }
    const selectPreviewDay = (day: number): void => {
      const clampedDay = Phaser.Math.Clamp(Math.floor(day), 1, 7);
      if (this.attendancePreviewDay === clampedDay) {
        return;
      }
      this.attendancePreviewDay = clampedDay;
      this.renderMain();
    };
    const claimedDayCount = Phaser.Math.Clamp(Math.floor(this.saveData.attendance.cycleDay), 0, 7);
    const seedIconTextureKey = this.textures.exists(SEED_DROP_TEXTURE_KEY) ? SEED_DROP_TEXTURE_KEY : SEED_ICON_TEXTURE_KEY;
    const attendanceGemIconKey = this.getAttendanceGemIconTextureKey();

    const scrim = this.add
      .rectangle(195, 338, 390, 676, 0x10161c, 0.52)
      .setInteractive({ useHandCursor: true });
    scrim.on("pointerup", () => {
      closeOverlay();
    });
    panel.add(scrim);

    const modalShadow = this.add.graphics();
    modalShadow.fillStyle(0x3a3022, 0.26);
    modalShadow.fillRoundedRect(modalCenterX - modalWidth / 2 + 3, modalTopY + 4, modalWidth, modalHeight, 16);
    panel.add(modalShadow);

    const modalBody = this.add.graphics();
    modalBody.fillStyle(0xfff8ec, 0.99);
    modalBody.fillRoundedRect(modalCenterX - modalWidth / 2, modalTopY, modalWidth, modalHeight, 16);
    modalBody.lineStyle(2, 0xbfa57d, 0.95);
    modalBody.strokeRoundedRect(modalCenterX - modalWidth / 2, modalTopY, modalWidth, modalHeight, 16);
    panel.add(modalBody);
    panel.add(this.add.rectangle(modalCenterX, modalTopY + 10, modalWidth - 32, 6, 0xffffff, 0.22));

    // Keep pointer events inside the modal from closing the scrim.
    const modalHitBlock = this.add
      .rectangle(modalCenterX, modalCenterY, modalWidth, modalHeight, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: false });
    modalHitBlock.on("pointerup", () => {
      // Swallow pointer events.
    });
    panel.add(modalHitBlock);

    panel.add(
      this.add
        .text(modalCenterX, modalTopY + 34, `${nextDay}일차 출석`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "28px",
          color: "#3f4a39",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    const cardWidth = 102;
    const cardHeight = 92;
    const day7CardHeight = 92;
    const cardGapX = 10;
    const cardGapY = 10;
    const attendanceBlockShiftY = -20;
    const cardStartX = modalCenterX - ((cardWidth * 3 + cardGapX * 2) / 2) + cardWidth / 2;
    const row1Y = modalTopY + 164 + attendanceBlockShiftY;
    const row2Y = row1Y + cardHeight + cardGapY;
    const row3Y = row2Y + cardHeight / 2 + cardGapY + day7CardHeight / 2;
    const attendanceGuideY = row1Y - cardHeight / 2 - cardGapY;

    panel.add(
      this.add
        .text(modalCenterX, attendanceGuideY, "오늘의 출석 + 해당 일차 해금 보상을 받기 위해 광고가 재생됩니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#5e685b",
          fontStyle: "700"
        })
        .setOrigin(0.5, 1)
    );

    const renderAttendanceDayCard = (
      day: number,
      centerX: number,
      centerY: number,
      width: number,
      height: number
    ): void => {
      const reward = getAttendanceRewardForDay(day);
      const unlockReward = getAttendanceUnlockRewardForDay(day);
      const isClaimed = day <= claimedDayCount;
      const isToday = !hasClaimedToday && day === nextDay;
      const isPreviewDay = day === previewDay;

      const baseFill = isClaimed ? 0xe4eddc : isToday ? 0xfff1dd : 0xf6f0e2;
      const baseStroke = isPreviewDay ? 0x5e8f58 : isClaimed ? 0x8fae8c : isToday ? 0x6e9f67 : 0xc7bda6;
      const baseTextColor = isClaimed ? "#415a44" : isToday ? "#46583f" : "#5f6456";
      panel.add(
        this.add
          .rectangle(centerX, centerY, width, height, baseFill, 0.99)
          .setStrokeStyle(isPreviewDay ? 2.8 : isToday ? 2.4 : 1.8, baseStroke, 0.97)
      );
      if (isToday) {
        panel.add(this.add.rectangle(centerX, centerY - height / 2 + 9, width - 14, 5, 0xffffff, 0.2));
      }

      panel.add(
        this.add
          .text(centerX, centerY - height / 2 + 14, `DAY ${day}`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "16px",
            color: baseTextColor,
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );

      if (unlockReward) {
        const unlockTextColor = this.saveData.attendance.unlockClaimedDays.includes(day) ? "#3f6545" : "#646055";
        const unlockCardLabel = day === 7
          ? this.getAttendanceUnlockCardLabel(day).replace(/\+/g, " + ")
          : truncateLabel(this.getAttendanceUnlockCardLabel(day), 10);
        panel.add(
          this.add
            .text(centerX, centerY - height / 2 + 32, `해금: ${unlockCardLabel}`, {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "11px",
              color: unlockTextColor,
              fontStyle: "700",
              align: "center"
            })
            .setOrigin(0.5)
        );
      }

      const rewardIconKey = reward.seedCount > 0 ? seedIconTextureKey : reward.gemCount > 0 ? attendanceGemIconKey : null;
      const rewardText =
        reward.seedCount > 0 ? `씨앗 x${reward.seedCount}` : reward.gemCount > 0 ? `보석 x${reward.gemCount}` : "보상 없음";
      if (rewardIconKey) {
        const iconSize = reward.seedCount > 0 ? (height <= 84 ? 24 : 28) : height <= 84 ? 20 : 24;
        panel.add(this.add.image(centerX, centerY + 9, rewardIconKey).setDisplaySize(iconSize, iconSize));
      } else {
        panel.add(
          this.add
            .text(centerX, centerY + 9, "?", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "16px",
              color: "#7d796d",
              fontStyle: "700"
            })
            .setOrigin(0.5)
        );
      }
      panel.add(
        this.add
          .text(centerX, centerY + height / 2 - 14, rewardText, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#5a5f53",
            fontStyle: "700"
          })
          .setOrigin(0.5)
      );

      if (isClaimed) {
        panel.add(this.add.rectangle(centerX, centerY, width, height, 0x162013, 0.44));
        const claimedBadgeWidth = Math.min(width - 20, 120);
        panel.add(
          this.add
            .rectangle(centerX, centerY, claimedBadgeWidth, 24, 0x1d3320, 0.9)
            .setStrokeStyle(1.5, 0xc7e0c2, 0.72)
        );
        panel.add(
          this.add
            .text(centerX, centerY, "수령완료", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "15px",
              color: "#ffffff",
              fontStyle: "700",
              stroke: "#273c2a",
              strokeThickness: 2.6
            })
            .setOrigin(0.5)
        );
      }

      const dayCardHit = this.add
        .rectangle(centerX, centerY, width, height, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      dayCardHit.on("pointerup", () => {
        if (isToday) {
          this.openAttendanceAdConfirmModal();
          return;
        }
        selectPreviewDay(day);
      });
      panel.add(dayCardHit);
    };

    for (let day = 1; day <= 6; day += 1) {
      const col = (day - 1) % 3;
      const row = Math.floor((day - 1) / 3);
      const centerX = cardStartX + col * (cardWidth + cardGapX);
      const centerY = (row === 0 ? row1Y : row2Y);
      renderAttendanceDayCard(day, centerX, centerY, cardWidth, cardHeight);
    }
    renderAttendanceDayCard(7, modalCenterX, row3Y, cardWidth * 3 + cardGapX * 2, day7CardHeight);
    const resetInfoY = row3Y + 62;
    panel.add(
      this.add
        .rectangle(modalCenterX, resetInfoY, 214, 26, 0xf1e9d7, 0.98)
        .setStrokeStyle(1, 0xcfbea0, 0.96)
    );
    panel.add(
      this.add
        .text(modalCenterX, resetInfoY, this.getAttendanceResetRemainingLabel(), {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#6b6458",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    const summaryDayLabel =
      previewDay === nextDay ? (hasClaimedToday ? `다음(DAY ${nextDay})` : `오늘(DAY ${nextDay})`) : `선택(DAY ${previewDay})`;
    panel.add(
      this.add
        .text(modalCenterX, resetInfoY + 26, `${summaryDayLabel} 보상: ${this.getAttendanceRewardLabel(previewDay)}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#5e685b",
          fontStyle: "700",
          align: "center",
          wordWrap: { width: 308 }
        })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(modalCenterX, resetInfoY + 44, `${summaryDayLabel} 해금: ${this.getAttendanceUnlockRewardLabel(previewDay)}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#5e685b",
          fontStyle: "700",
          align: "center",
          wordWrap: { width: 308 }
        })
        .setOrigin(0.5)
    );

    this.addCollectionCloseButton(panel, modalCenterX + modalWidth / 2 - 30, modalTopY + 22, closeOverlay);
  }

  private hasClaimedAttendanceToday(nowMs = Date.now()): boolean {
    return this.saveData.attendance.lastClaimedPeriodKey === getAttendancePeriodKeyKst(nowMs);
  }

  private getAttendanceNextDay(): number {
    return Math.min(7, Math.max(1, Math.floor(this.saveData.attendance.cycleDay) + 1));
  }

  private getAttendanceRewardLabel(day: number): string {
    const reward = getAttendanceRewardForDay(day);
    const chunks: string[] = [];
    if (reward.seedCount > 0) {
      chunks.push(`씨앗 x${reward.seedCount}`);
    }
    if (reward.gemCount > 0) {
      chunks.push(`보석 x${reward.gemCount}`);
    }
    if (chunks.length === 0) {
      return "없음";
    }
    return chunks.join(" + ");
  }

  private getAttendanceUnlockRewardLabel(day: number): string {
    const reward = getAttendanceUnlockRewardForDay(day);
    if (!reward) {
      return "없음";
    }
    const chunks = this.getAttendanceUnlockRewardChunks(reward, false);
    return chunks.length > 0 ? chunks.join(" + ") : reward.titleKo;
  }

  private getAttendanceUnlockCardLabel(day: number): string {
    const reward = getAttendanceUnlockRewardForDay(day);
    if (!reward) {
      return "없음";
    }
    const compactChunks = this.getAttendanceUnlockRewardChunks(reward, true);
    if (compactChunks.length > 0) {
      return compactChunks.join("+");
    }
    const trimmedTitle = reward.titleKo.replace(/\s*해금$/, "").trim();
    return trimmedTitle.length > 0 ? trimmedTitle : reward.titleKo.trim();
  }

  private getAttendanceUnlockRewardChunks(reward: AttendanceUnlockRewardDef, compact: boolean): string[] {
    const chunks: string[] = [];
    if (reward.seedCount && reward.seedCount > 0) {
      chunks.push(compact ? `씨앗x${reward.seedCount}` : `랜덤 씨앗 x${reward.seedCount}`);
    }
    if (reward.gemCount && reward.gemCount > 0) {
      chunks.push(compact ? `보석x${reward.gemCount}` : `보석 x${reward.gemCount}`);
    }
    if (reward.coinCount && reward.coinCount > 0) {
      chunks.push(compact ? `코인x${reward.coinCount}` : `코인 x${reward.coinCount}`);
    }
    if (reward.unlockPotId && POT_BY_ID[reward.unlockPotId]) {
      chunks.push(`${POT_BY_ID[reward.unlockPotId].nameKo} 화분`);
    }
    if (reward.unlockBackgroundId && BACKGROUND_BY_ID[reward.unlockBackgroundId]) {
      chunks.push(`${BACKGROUND_BY_ID[reward.unlockBackgroundId].nameKo} 배경`);
    }
    return chunks;
  }

  private applyAttendanceUnlockReward(draft: SaveDataV1, day: number): string | null {
    const reward = getAttendanceUnlockRewardForDay(day);
    if (!reward) {
      return null;
    }
    if (draft.attendance.unlockClaimedDays.includes(day)) {
      return null;
    }

    const granted: string[] = [];

    if (reward.seedCount && reward.seedCount > 0) {
      const grantedSeedCount = this.grantRandomSeedRewards(draft.inventory.seedCounts, reward.seedCount);
      if (grantedSeedCount > 0) {
        granted.push(`랜덤 씨앗 x${grantedSeedCount}`);
      }
    }
    if (reward.gemCount && reward.gemCount > 0) {
      draft.player.gems = clampGems(draft.player.gems + reward.gemCount);
      granted.push(`보석 x${reward.gemCount}`);
    }
    if (reward.coinCount && reward.coinCount > 0) {
      draft.player.coins = clampCoins(draft.player.coins + reward.coinCount);
      granted.push(`코인 x${reward.coinCount}`);
    }
    if (reward.unlockPotId && POT_BY_ID[reward.unlockPotId] && !draft.collection.ownedPotIds.includes(reward.unlockPotId)) {
      draft.collection.ownedPotIds.push(reward.unlockPotId);
      granted.push(`${POT_BY_ID[reward.unlockPotId].nameKo} 화분`);
    }
    if (
      reward.unlockBackgroundId &&
      BACKGROUND_BY_ID[reward.unlockBackgroundId] &&
      !draft.collection.ownedBackgroundIds.includes(reward.unlockBackgroundId)
    ) {
      draft.collection.ownedBackgroundIds.push(reward.unlockBackgroundId);
      granted.push(`${BACKGROUND_BY_ID[reward.unlockBackgroundId].nameKo} 배경`);
    }

    draft.attendance.unlockClaimedDays.push(day);
    draft.attendance.unlockClaimedDays = Array.from(
      new Set(draft.attendance.unlockClaimedDays.filter((claimedDay) => claimedDay >= 1 && claimedDay <= 7))
    ).sort((a, b) => a - b);

    return granted.length > 0 ? granted.join(" + ") : "지급 없음";
  }

  private openAttendanceAdConfirmModal(): void {
    if (this.hasClaimedAttendanceToday()) {
      this.showToast("오늘은 이미 출석 보상을 받았습니다.");
      return;
    }

    this.closeAttendanceAdConfirmModal();

    const modal = this.add.container(0, 0);
    this.attendanceAdConfirmModal = modal;
    this.modalLayer.add(modal);

    const modalCenterX = 195;
    const modalCenterY = 422;
    const modalWidth = 324;
    const modalHeight = 216;
    const modalTopY = modalCenterY - modalHeight / 2;
    const titleY = modalTopY + 28;
    const bodyTopY = modalTopY + 56;
    const actionButtonY = modalTopY + modalHeight - 34;
    const nextDay = this.getAttendanceNextDay();
    const todayBaseRewardLabel = this.getAttendanceRewardLabel(nextDay);
    const todayUnlockRewardLabel = this.getAttendanceUnlockRewardLabel(nextDay);
    const closeModal = (): void => {
      this.closeAttendanceAdConfirmModal();
    };
    const confirmModal = (): void => {
      this.closeAttendanceAdConfirmModal();
      this.requestAttendanceRewardAdThenClaim();
    };

    const scrim = this.add
      .rectangle(modalCenterX, modalCenterY, 390, 844, 0x1d241f, 0.62)
      .setInteractive({ useHandCursor: true });
    scrim.on("pointerup", () => {
      // Swallow pointer events so the modal behaves like a blocking dialog.
    });
    modal.add(scrim);

    modal.add(
      this.add
        .rectangle(modalCenterX, modalCenterY, modalWidth, modalHeight, 0xfff8eb, 0.99)
        .setStrokeStyle(2, 0xb79f79, 0.95)
    );
    modal.add(this.add.rectangle(modalCenterX, modalTopY + 10, modalWidth - 24, 6, 0xffffff, 0.22));
    modal.add(
      this.add
        .text(modalCenterX, titleY, "광고 시청 안내", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "20px",
          color: "#3c4034",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    modal.add(
      this.add
        .text(
          modalCenterX,
          bodyTopY,
          `${ATTENDANCE_AD_CONFIRM_MESSAGE}\n기본 보상: ${todayBaseRewardLabel}\n해금 보상: ${todayUnlockRewardLabel}`,
          {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "13px",
            color: "#5a5d50",
            align: "center",
            lineSpacing: 4
          }
        )
        .setOrigin(0.5, 0)
    );

    this.addButton(modal, 130, actionButtonY, 112, 34, "취소", closeModal, {
      fillColor: 0x7d735f,
      textColor: "#ffffff",
      fontSize: 13
    });
    this.addButton(modal, 260, actionButtonY, 112, 34, "확인", confirmModal, {
      fillColor: 0x5f8a54,
      textColor: "#ffffff",
      fontSize: 13
    });
  }

  private closeAttendanceAdConfirmModal(): void {
    if (this.attendanceAdConfirmModal) {
      this.attendanceAdConfirmModal.destroy(true);
      this.attendanceAdConfirmModal = null;
    }
  }

  private requestAttendanceRewardAdThenClaim(): void {
    // TODO: 출시 직전 보상형 광고 SDK 연동 시 [광고 시청 성공 콜백]에서 claimAttendanceReward() 호출.
    this.claimAttendanceReward();
  }

  private grantRandomSeedRewards(seedCounts: Record<string, number>, requestedCount: number): number {
    const grantCount = Math.min(Math.max(0, Math.floor(requestedCount)), getSeedCapacity(seedCounts));
    if (grantCount <= 0) {
      return 0;
    }

    const speciesPool = getActiveGrowableSpecies();
    const fallbackPool = AVAILABLE_PLANT_SPECIES_DEFS;
    const pool = speciesPool.length > 0 ? speciesPool : fallbackPool;
    if (pool.length <= 0) {
      return 0;
    }

    for (let index = 0; index < grantCount; index += 1) {
      const species = Phaser.Utils.Array.GetRandom(pool);
      if (!species) {
        break;
      }
      seedCounts[species.id] = Math.max(0, Math.floor(seedCounts[species.id] ?? 0)) + 1;
    }

    return grantCount;
  }

  private claimAttendanceReward(): void {
    const currentPeriodKey = getAttendancePeriodKeyKst(Date.now());
    if (this.saveData.attendance.lastClaimedPeriodKey === currentPeriodKey) {
      this.showToast("오늘은 이미 출석 보상을 받았습니다.");
      return;
    }

    const nextDay = this.getAttendanceNextDay();
    let unlockRewardMessage: string | null = null;

    const claimed = this.applyMutation(
      (draft) => {
        const draftPeriodKey = getAttendancePeriodKeyKst(Date.now());
        if (draft.attendance.lastClaimedPeriodKey === draftPeriodKey) {
          return false;
        }

        const draftDay = Math.min(7, Math.max(1, Math.floor(draft.attendance.cycleDay) + 1));
        const draftReward = getAttendanceRewardForDay(draftDay);

        if (draftReward.seedCount > 0) {
          this.grantRandomSeedRewards(draft.inventory.seedCounts, draftReward.seedCount);
        }
        if (draftReward.gemCount > 0) {
          draft.player.gems = clampGems(draft.player.gems + draftReward.gemCount);
        }
        unlockRewardMessage = this.applyAttendanceUnlockReward(draft, draftDay);

        draft.attendance.lastClaimedPeriodKey = draftPeriodKey;
        draft.attendance.cycleDay = draftDay >= 7 ? 0 : draftDay;
        return true;
      },
      undefined,
      "오늘은 이미 출석 보상을 받았습니다."
    );
    if (!claimed) {
      return;
    }

    const toastChunks = [`출석 ${nextDay}일차 수령완료`];
    if (unlockRewardMessage) {
      toastChunks.push(`해금 ${unlockRewardMessage}`);
    }
    if (nextDay === 7) {
      toastChunks.push("7일 루프 완료");
    }
    this.showToast(toastChunks.join(" | "));
  }

  private renderSeedShopItems(panel: Phaser.GameObjects.Container): void {
    const totalPage = Math.max(1, Math.ceil(AVAILABLE_PLANT_SPECIES_DEFS.length / SHOP_PAGE_SIZE));
    this.shopPage = Phaser.Math.Clamp(this.shopPage, 0, totalPage - 1);

    const pageItems = AVAILABLE_PLANT_SPECIES_DEFS.slice(
      this.shopPage * SHOP_PAGE_SIZE,
      this.shopPage * SHOP_PAGE_SIZE + SHOP_PAGE_SIZE
    );

    pageItems.forEach((species, localIndex) => {
      const y = SHOP_ITEM_BASE_Y + localIndex * 106;
      const count = this.saveData.inventory.seedCounts[species.id] ?? 0;
      const canAfford = this.saveData.player.coins >= species.seedPrice;

      panel.add(this.add.rectangle(195, y, 352, 102, 0xfff8eb).setStrokeStyle(2, 0xccbf9f));
      panel.add(this.add.circle(44, y - 12, 11, RARITY_COLORS[species.rarity]));

      panel.add(
        this.add
          .text(64, y - 26, species.nameKo, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "20px",
            color: "#3e4539",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );

      panel.add(
        this.add
          .text(64, y - 1, `${RARITY_LABELS[species.rarity]} | 성장 ${formatSeconds(species.growSeconds)} | 보상 ${species.rewardCoins}`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#5a6a59"
          })
          .setOrigin(0, 0)
      );

      panel.add(
        this.add
          .text(64, y + 20, `${species.descriptionKo} | 보유 씨앗 ${count}`, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#696453",
            wordWrap: { width: 220 }
          })
          .setOrigin(0, 0)
      );

      this.addButton(
        panel,
        312,
        y + 4,
        74,
        32,
        `${species.seedPrice}`,
        () => {
          this.buySeed(species.id);
        },
        {
          enabled: canAfford,
          fillColor: 0x5d8a4e,
          textColor: "#ffffff",
          fontSize: 14
        }
      );
    });

    this.renderShopPageFooter(panel, totalPage);
  }

  private renderPotShopItems(panel: Phaser.GameObjects.Container): void {
    const totalPage = Math.max(1, Math.ceil(POT_DEFS.length / SHOP_PAGE_SIZE));
    this.shopPage = Phaser.Math.Clamp(this.shopPage, 0, totalPage - 1);

    const pageItems = POT_DEFS.slice(this.shopPage * SHOP_PAGE_SIZE, this.shopPage * SHOP_PAGE_SIZE + SHOP_PAGE_SIZE);

    pageItems.forEach((pot, localIndex) => {
      const y = SHOP_ITEM_BASE_Y + localIndex * 115;
      const owned = this.saveData.collection.ownedPotIds.includes(pot.id);
      const canAfford = this.saveData.player.coins >= pot.price;
      const potPreviewCardX = 66;
      const potPreviewCardY = y + 1;
      const potTextX = 106;

      panel.add(this.add.rectangle(195, y, 352, 102, 0xfff8eb).setStrokeStyle(2, 0xccbf9f));
      panel.add(this.add.rectangle(potPreviewCardX, potPreviewCardY, 66, 84, 0xd7cab0, 0.98).setStrokeStyle(1, 0xa89878, 0.92));
      const renderedPotPreview = this.addPotPreviewImage(panel, pot.id, potPreviewCardX, y - 1, 54, 54);
      if (!renderedPotPreview) {
        panel.add(
          this.add
            .ellipse(potPreviewCardX, y + 1, 40, 20, hexToNumber(pot.colorHex))
            .setStrokeStyle(2, hexToNumber(pot.rimHex))
        );
      }

      panel.add(
        this.add
          .text(potTextX, y - 20, pot.nameKo, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "19px",
            color: "#3e4539",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );

      if (owned) {
        panel.add(
          this.add
            .text(potTextX, y + 6, "정원에서 슬롯별로 변경 가능", {
              fontFamily: "Pretendard, sans-serif",
              fontSize: "12px",
              color: "#686251",
              wordWrap: { width: 174 }
            })
            .setOrigin(0, 0)
        );
      }

      if (owned) {
        this.addButton(panel, 312, y + 4, 74, 32, "보유중", () => undefined, {
          enabled: false,
          fillColor: 0x8f9589,
          textColor: "#ffffff",
          fontSize: 14
        });
      } else {
        this.addButton(
          panel,
          312,
          y + 4,
          74,
          32,
          `${pot.price}`,
          () => {
            this.buyPot(pot.id);
          },
          {
            enabled: canAfford,
            fillColor: 0x547f8f,
            textColor: "#ffffff",
            fontSize: 14
          }
        );
      }
    });

    this.renderShopPageFooter(panel, totalPage);
  }

  private renderBackgroundShopItems(panel: Phaser.GameObjects.Container): void {
    const totalPage = Math.max(1, Math.ceil(SHOP_BACKGROUND_DEFS.length / SHOP_PAGE_SIZE));
    this.shopPage = Phaser.Math.Clamp(this.shopPage, 0, totalPage - 1);

    const pageItems = SHOP_BACKGROUND_DEFS.slice(
      this.shopPage * SHOP_PAGE_SIZE,
      this.shopPage * SHOP_PAGE_SIZE + SHOP_PAGE_SIZE
    );

    pageItems.forEach((background, localIndex) => {
      const y = SHOP_ITEM_BASE_Y + localIndex * 115;
      const owned = this.saveData.collection.ownedBackgroundIds.includes(background.id);
      const canAfford = this.saveData.player.coins >= background.price;
      const previewCardX = 66;
      const previewCardY = y + 1;
      const textX = 106;

      panel.add(this.add.rectangle(195, y, 352, 102, 0xfffbef).setStrokeStyle(2, 0xccbf9f));
      const previewConfig = BACKGROUND_IMAGE_CONFIG[background.id];
      if (previewConfig && this.textures.exists(previewConfig.textureKey)) {
        this.addContainedImage(panel, previewConfig.textureKey, previewCardX, previewCardY, 61, 79);
      } else {
        panel.add(this.add.rectangle(previewCardX, y - 10, 44, 24, hexToNumber(background.skyTopHex)));
        panel.add(this.add.rectangle(previewCardX, y + 4, 44, 14, hexToNumber(background.skyBottomHex)));
        panel.add(this.add.rectangle(previewCardX, y + 16, 44, 10, hexToNumber(background.groundHex)));
      }

      panel.add(
        this.add
          .text(textX, y - 20, background.nameKo, {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "19px",
            color: "#3e4539",
            fontStyle: "700"
          })
          .setOrigin(0, 0)
      );

      panel.add(
        this.add
          .text(textX, y + 6, owned ? "보유중" : "정원 전체 배경 테마", {
            fontFamily: "Pretendard, sans-serif",
            fontSize: "12px",
            color: "#686251"
          })
          .setOrigin(0, 0)
      );

      if (!owned) {
        this.addButton(
          panel,
          312,
          y + 4,
          74,
          32,
          `${background.price}`,
          () => {
            this.buyBackground(background.id);
          },
          {
            enabled: canAfford,
            fillColor: 0x5d8060,
            textColor: "#ffffff",
            fontSize: 14
          }
        );
      } else {
        this.addButton(panel, 312, y + 4, 74, 32, "보유중", () => undefined, {
          enabled: false,
          fillColor: 0x8f9589,
          textColor: "#ffffff",
          fontSize: 14
        });
      }
    });

    this.renderShopPageFooter(panel, totalPage);
  }

  private renderShopPageFooter(panel: Phaser.GameObjects.Container, totalPage: number): void {
    this.addButton(
      panel,
      112,
      SHOP_FOOTER_Y,
      88,
      34,
      "이전",
      () => {
        this.shopPage = Phaser.Math.Clamp(this.shopPage - 1, 0, totalPage - 1);
        this.renderMain();
      },
      {
        enabled: this.shopPage > 0,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );

    panel.add(
      this.add
        .text(195, SHOP_FOOTER_Y, `${this.shopPage + 1} / ${totalPage}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#5e6a5c"
        })
        .setOrigin(0.5)
    );

    this.addButton(
      panel,
      278,
      SHOP_FOOTER_Y,
      88,
      34,
      "다음",
      () => {
        this.shopPage = Phaser.Math.Clamp(this.shopPage + 1, 0, totalPage - 1);
        this.renderMain();
      },
      {
        enabled: this.shopPage < totalPage - 1,
        fillColor: 0x6f8465,
        textColor: "#F2F2F2",
        fontSize: 15
      }
    );
  }

  private renderSettingsPanel(): void {
    const panel = this.add.container(0, 0);
    this.mainLayer.add(panel);

    panel.add(this.add.rectangle(195, MAIN_HEIGHT / 2, 390, MAIN_HEIGHT, 0xf3efe4));

    panel.add(
      this.add
        .text(24, 22, "설정", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "26px",
          color: "#394637",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    this.addMobileCloseButton(panel, 356, 36, () => {
      this.activeTab = "home";
      this.renderAll();
    });

    panel.add(this.add.rectangle(195, 140, 346, 128, 0xfffbef).setStrokeStyle(2, 0xcbc3aa));
    panel.add(
      this.add
        .text(195, 116, "이번 버전은 사운드가 비활성화되어 있습니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "15px",
          color: "#5c6257",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(195, 140, "효과음/BGM은 출시 후 업데이트에서 다시 추가할 예정입니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#7a7468"
        })
        .setOrigin(0.5)
    );

    this.addButton(
      panel,
      195,
      176,
      320,
      36,
      "저장 즉시 실행",
      () => {
        this.saveRepository.saveDebounced(this.saveData);
        this.saveRepository.flush();
        this.showToast("현재 데이터를 저장했습니다.");
      },
      {
        fillColor: 0x6c7e8f,
        textColor: "#ffffff",
        fontSize: 14
      }
    );

    panel.add(this.add.rectangle(195, 306, 346, 154, 0xfffbef).setStrokeStyle(2, 0xcbc3aa));

    panel.add(
      this.add
        .text(34, 250, `세이브 스키마: v${this.saveData.schemaVersion}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "14px",
          color: "#4e5f4e"
        })
        .setOrigin(0, 0)
    );

    panel.add(
      this.add
        .text(34, 276, `생성일: ${formatDateTime(this.saveData.player.createdAt)}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#6c6759"
        })
        .setOrigin(0, 0)
    );

    panel.add(
      this.add
        .text(34, 298, `마지막 활동: ${formatDateTime(this.saveData.player.lastActiveAt)}`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#6c6759"
        })
        .setOrigin(0, 0)
    );

    panel.add(
      this.add
        .text(34, 320, "오프라인 진행 최대 누적: 8시간", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#6c6759"
        })
        .setOrigin(0, 0)
    );

    panel.add(this.add.rectangle(195, 476, 346, 126, 0xfff3ed).setStrokeStyle(2, 0xd2b3a6));

    panel.add(
      this.add
        .text(34, 428, "데이터 초기화", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "18px",
          color: "#7a3e30",
          fontStyle: "700"
        })
        .setOrigin(0, 0)
    );

    panel.add(
      this.add
        .text(34, 452, "초기화하면 정원 진행, 수집, 코인이 모두 삭제됩니다.", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "12px",
          color: "#7f6158"
        })
        .setOrigin(0, 0)
    );

    const resetArmed = this.resetArmedUntil > Date.now();
    this.addButton(
      panel,
      195,
      500,
      308,
      40,
      resetArmed ? "다시 누르면 초기화됩니다" : "데이터 초기화",
      () => {
        this.handleResetAction();
      },
      {
        fillColor: resetArmed ? 0xb14d36 : 0x95635b,
        textColor: "#ffffff",
        fontSize: 15
      }
    );
  }

  private handleResetAction(): void {
    const now = Date.now();
    if (this.resetArmedUntil < now) {
      this.resetArmedUntil = now + 5000;
      this.renderMain();
      this.showToast("5초 이내에 다시 누르면 초기화됩니다.");
      return;
    }

    this.saveRepository.clear();
    this.closeAttendanceAdConfirmModal();
    this.closeDecorGoalModal();
    this.closeDecorSlotEditModal();
    this.saveData = createDefaultSaveData();
    this.selectedCollectionSpeciesId = null;
    this.selectedDecorItemId = null;
    this.selectedDecorSlotId = null;
    this.selectedDecorFlowerId = DEFAULT_DECOR_FLOWER_ID;
    this.selectedDecorPotId = POT_DEFS[0]?.id ?? "";
    this.decoratePaletteType = "flower";
    this.pendingDecorPlacementType = null;
    this.isDecorEditMode = false;
    this.isDecorClearMode = false;
    this.selectedCustomizePotId = POT_DEFS[0]?.id ?? "";
    this.selectedCustomizeBackgroundId = BACKGROUND_DEFS[0]?.id ?? "";
    this.isHomeCustomizeGridOpen = false;
    this.isHomeAttendancePanelOpen = false;
    this.collectionPage = 0;
    this.shopPage = 0;
    this.shopTab = "pot";
    this.resetArmedUntil = 0;
    this.saveRepository.saveDebounced(this.saveData);
    this.renderAll();
    this.showToast("데이터를 초기화했습니다.");
  }

  private handleHeroTap(): void {
    if (this.isHomeAttendancePanelOpen || this.attendanceAdConfirmModal || this.harvestNicknameModal) {
      return;
    }

    const slot = this.getSelectedSlot();
    if (!slot) {
      return;
    }

    if (!slot.planted) {
      this.plantToSelectedSlot();
      return;
    }
    if (isPlantHarvestable(slot.planted, Date.now())) {
      this.harvestSelectedSlot();
      return;
    }

    const boostSeconds = this.getTapGrowthBoostSeconds();

    const accelerated = this.applyMutation((draft) => {
      const draftSlot = draft.garden.slots.find((candidate) => candidate.slotId === slot.slotId);
      if (!draftSlot?.planted) {
        return false;
      }

      const now = Date.now();
      if (isPlantHarvestable(draftSlot.planted, now)) {
        return false;
      }

      if (!isPlantHarvestable(draftSlot.planted, now)) {
        draftSlot.planted.plantedAt -= boostSeconds * 1000;
        if (isPlantHarvestable(draftSlot.planted, now)) {
          draftSlot.planted.harvested = true;
        }
      }

      return true;
    });
    if (!accelerated) {
      return;
    }

    this.playHomeTapFeedbackEffects();

    const floating = this.add
      .text(CLICKER_CENTER_X, CLICKER_FLOATING_Y, `탭 가속 +${boostSeconds}초`, {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "15px",
        color: "#2f5f30",
        stroke: "#f8f3e5",
        strokeThickness: 4,
        fontStyle: "700"
      })
      .setOrigin(0.5);
    this.toastLayer.add(floating);
    this.tweens.add({
      targets: floating,
      y: CLICKER_FLOATING_TARGET_Y,
      alpha: 0,
      duration: 420,
      onComplete: () => {
        floating.destroy();
      }
    });
  }

  private playHomeTapFeedbackEffects(): void {
    if (this.activeTab !== "home") {
      return;
    }

    const now = Date.now();
    if (now < this.homeTapEffectCooldownUntil) {
      return;
    }
    this.homeTapEffectCooldownUntil = now + 70;

    const pulseTarget = this.homePotPulseTarget;
    if (pulseTarget && pulseTarget.active) {
      this.tweens.killTweensOf(pulseTarget);
      pulseTarget.setScale(1);
      this.tweens.add({
        targets: pulseTarget,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 80,
        ease: "Sine.Out",
        yoyo: true,
        onComplete: () => {
          if (!pulseTarget.active) {
            return;
          }
          this.tweens.add({
            targets: pulseTarget,
            scaleX: 0.98,
            scaleY: 0.98,
            duration: 60,
            ease: "Sine.Out",
            yoyo: true,
            onComplete: () => {
              if (!pulseTarget.active) {
                return;
              }
              pulseTarget.setScale(1);
            }
          });
        }
      });
    }

    const dropCount = Phaser.Math.Between(4, 6);
    const soilY = CLICKER_CENTER_Y + 33;
    const waterLandingY = this.getHomeWaterLandingY();
    const dropStartBaseY = soilY - 200;
    for (let index = 0; index < dropCount; index += 1) {
      const dropX = CLICKER_CENTER_X + Phaser.Math.Between(-18, 18);
      const dropY = dropStartBaseY + Phaser.Math.Between(-6, 6);
      const drop = this.add.circle(dropX, dropY, Phaser.Math.Between(4, 5), 0x4f9fd3, 1);
      this.homeTapEffectLayer.add(drop);

      const targetX = dropX + Phaser.Math.Between(-4, 4);
      const targetY = waterLandingY + Phaser.Math.Between(-1, 2);
      this.tweens.add({
        targets: drop,
        x: targetX,
        y: targetY,
        alpha: 0.76,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 390 + Phaser.Math.Between(0, 120),
        ease: "Quad.In",
        onComplete: () => {
          const splashY = waterLandingY + Phaser.Math.Between(1, 3);
          const splash = this.add.ellipse(targetX, splashY, Phaser.Math.Between(8, 11), Phaser.Math.Between(3, 4), 0x72b9e4, 0.9);
          this.homeTapEffectLayer.add(splash);
          this.tweens.add({
            targets: splash,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 0.78,
            duration: 170,
            ease: "Sine.Out",
            onComplete: () => {
              splash.destroy();
            }
          });

          drop.destroy();
        }
      });
    }
  }

  private playHomeBloomReadyEffects(species: PlantSpeciesDef): void {
    if (this.activeTab !== "home" || !this.homeTapEffectLayer?.active) {
      return;
    }

    this.cameras.main.shake(110, 0.0016, true);
    this.cameras.main.flash(120, 255, 246, 209, false);

    const bloomColor = hexToNumber(species.bloomColorHex, 0xf28496);
    const ringA = this.add.circle(CLICKER_CENTER_X, CLICKER_CENTER_Y + 16, 24, bloomColor, 0.32);
    ringA.setStrokeStyle(2.4, shiftColor(bloomColor, -18), 0.86);
    this.homeTapEffectLayer.add(ringA);
    this.tweens.add({
      targets: ringA,
      scaleX: 1.56,
      scaleY: 1.56,
      alpha: 0,
      duration: 280,
      ease: "Cubic.Out",
      onComplete: () => {
        ringA.destroy();
      }
    });

    const ringB = this.add.circle(CLICKER_CENTER_X, CLICKER_CENTER_Y + 16, 12, bloomColor, 0.24);
    ringB.setStrokeStyle(2, shiftColor(bloomColor, 18), 0.82);
    this.homeTapEffectLayer.add(ringB);
    this.tweens.add({
      targets: ringB,
      scaleX: 2.1,
      scaleY: 2.1,
      alpha: 0,
      delay: 36,
      duration: 260,
      ease: "Sine.Out",
      onComplete: () => {
        ringB.destroy();
      }
    });

    const sparkleCount = 12;
    for (let index = 0; index < sparkleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkleCount;
      const startRadius = 6 + (index % 3) * 2;
      const endRadius = 30 + (index % 3) * 4;
      const sparkle = this.add.circle(
        CLICKER_CENTER_X + Math.cos(angle) * startRadius,
        CLICKER_CENTER_Y + 12 + Math.sin(angle) * startRadius,
        3,
        0xfff9d6,
        1
      );
      this.homeTapEffectLayer.add(sparkle);
      this.tweens.add({
        targets: sparkle,
        x: CLICKER_CENTER_X + Math.cos(angle) * endRadius,
        y: CLICKER_CENTER_Y + 12 + Math.sin(angle) * endRadius,
        alpha: 0,
        scaleX: 0.42,
        scaleY: 0.42,
        duration: 220 + index * 14,
        ease: "Sine.Out",
        onComplete: () => {
          sparkle.destroy();
        }
      });
    }

    const rayCount = 6;
    for (let index = 0; index < rayCount; index += 1) {
      const ray = this.add.rectangle(CLICKER_CENTER_X, CLICKER_CENTER_Y + 14, 3, 24, 0xfff3c2, 0.95);
      ray.setAngle((360 / rayCount) * index + Phaser.Math.Between(-5, 5));
      this.homeTapEffectLayer.add(ray);
      this.tweens.add({
        targets: ray,
        scaleY: 1.85,
        alpha: 0,
        duration: 210,
        ease: "Quad.Out",
        onComplete: () => {
          ray.destroy();
        }
      });
    }

    const bloomText = this.add
      .text(CLICKER_CENTER_X, CLICKER_FLOATING_Y - 8, "개화 완료!", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "16px",
        color: "#f7fff4",
        stroke: "#2e5b2a",
        strokeThickness: 4,
        fontStyle: "700"
      })
      .setOrigin(0.5);
    this.toastLayer.add(bloomText);
    this.tweens.add({
      targets: bloomText,
      y: CLICKER_FLOATING_TARGET_Y - 8,
      alpha: 0,
      duration: 380,
      ease: "Quad.Out",
      onComplete: () => {
        bloomText.destroy();
      }
    });
  }

  private playHomeHarvestCelebrationEffects(species: PlantSpeciesDef): void {
    if (this.activeTab !== "home") {
      return;
    }

    this.cameras.main.shake(130, 0.0022, true);
    this.cameras.main.flash(110, 255, 235, 176, false);

    const bloomColor = hexToNumber(species.bloomColorHex, 0xf18590);
    const stemColor = hexToNumber(species.stemColorHex, 0x5f9d5a);
    const potTarget = this.homePotPulseTarget;
    if (potTarget && potTarget.active) {
      this.tweens.killTweensOf(potTarget);
      potTarget.setScale(1);
      this.tweens.add({
        targets: potTarget,
        scaleX: 1.09,
        scaleY: 1.09,
        duration: 90,
        ease: "Sine.Out",
        yoyo: true,
        repeat: 1
      });
    }

    const shockwave = this.add.circle(CLICKER_CENTER_X, CLICKER_CENTER_Y + 26, 20, bloomColor, 0.24);
    shockwave.setStrokeStyle(2.4, shiftColor(bloomColor, -16), 0.86);
    this.homeTapEffectLayer.add(shockwave);
    this.tweens.add({
      targets: shockwave,
      scaleX: 1.95,
      scaleY: 1.95,
      alpha: 0,
      duration: 280,
      ease: "Cubic.Out",
      onComplete: () => {
        shockwave.destroy();
      }
    });

    const burstCount = 18;
    for (let index = 0; index < burstCount; index += 1) {
      const angle = -Math.PI / 2 + Phaser.Math.FloatBetween(-0.9, 0.9);
      const speed = Phaser.Math.Between(60, 136);
      const petal = this.add.rectangle(CLICKER_CENTER_X, CLICKER_CENTER_Y + 24, 8, 4, bloomColor, 0.96);
      petal.setAngle(Phaser.Math.Between(-35, 35));
      this.homeTapEffectLayer.add(petal);
      this.tweens.add({
        targets: petal,
        x: petal.x + Math.cos(angle) * speed,
        y: petal.y + Math.sin(angle) * speed,
        alpha: 0,
        angle: petal.angle + Phaser.Math.Between(-50, 50),
        duration: 260 + Phaser.Math.Between(0, 170),
        ease: "Cubic.Out",
        onComplete: () => {
          petal.destroy();
        }
      });
    }

    const coinBurstCount = 9;
    for (let index = 0; index < coinBurstCount; index += 1) {
      const coin = this.add.circle(CLICKER_CENTER_X + Phaser.Math.Between(-8, 8), CLICKER_CENTER_Y + 38, 5, 0xffd76f, 0.98);
      coin.setStrokeStyle(1.5, 0xbd8f36, 0.9);
      this.homeTapEffectLayer.add(coin);
      this.tweens.add({
        targets: coin,
        x: coin.x + Phaser.Math.Between(-70, 70),
        y: coin.y - Phaser.Math.Between(62, 92),
        alpha: 0,
        duration: 280 + index * 26,
        ease: "Sine.Out",
        onComplete: () => {
          coin.destroy();
        }
      });
    }

    const bonusText = this.add
      .text(CLICKER_CENTER_X, CLICKER_FLOATING_Y - 12, `+${species.rewardCoins} 코인`, {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "17px",
        color: "#fff8cf",
        stroke: "#5c481f",
        strokeThickness: 4,
        fontStyle: "700"
      })
      .setOrigin(0.5);
    this.toastLayer.add(bonusText);
    this.tweens.add({
      targets: bonusText,
      y: CLICKER_FLOATING_TARGET_Y - 22,
      alpha: 0,
      duration: 420,
      ease: "Quad.Out",
      onComplete: () => {
        bonusText.destroy();
      }
    });

    const stemGlow = this.add.ellipse(CLICKER_CENTER_X, CLICKER_CENTER_Y + 32, 96, 28, stemColor, 0.34);
    this.homeTapEffectLayer.add(stemGlow);
    this.tweens.add({
      targets: stemGlow,
      alpha: 0,
      scaleX: 1.58,
      scaleY: 1.34,
      duration: 300,
      ease: "Sine.Out",
      onComplete: () => {
        stemGlow.destroy();
      }
    });
  }

  private maybePlayHomeIdleWaterDrop(nowMs: number): void {
    if (this.activeTab !== "home") {
      return;
    }
    if (this.isHomeAttendancePanelOpen || this.attendanceAdConfirmModal || this.harvestNicknameModal) {
      return;
    }
    if (!this.homeTapEffectLayer?.active) {
      return;
    }
    const selectedSlot = this.getSelectedSlot();
    if (!selectedSlot?.planted) {
      this.nextHomeIdleWaterDropAt = 0;
      return;
    }
    if (nowMs < this.nextHomeIdleWaterDropAt) {
      return;
    }
    this.nextHomeIdleWaterDropAt = nowMs + Phaser.Math.Between(2300, 3200);

    const soilY = CLICKER_CENTER_Y + 33;
    const waterLandingY = this.getHomeWaterLandingY();
    const idleDropCount = Phaser.Math.Between(1, 2);
    for (let index = 0; index < idleDropCount; index += 1) {
      const dropX = CLICKER_CENTER_X + Phaser.Math.Between(-14, 14);
      const dropY = soilY - 210 + Phaser.Math.Between(-8, 8);
      const drop = this.add.circle(dropX, dropY, Phaser.Math.Between(4, 5), 0x56a9d8, 0.96);
      this.homeTapEffectLayer.add(drop);

      const targetX = dropX + Phaser.Math.Between(-2, 2);
      const targetY = waterLandingY + Phaser.Math.Between(-1, 1);
      this.tweens.add({
        targets: drop,
        x: targetX,
        y: targetY,
        alpha: 0.84,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 520 + index * 60,
        ease: "Quad.In",
        onComplete: () => {
          const splash = this.add.ellipse(targetX, waterLandingY + 2, 9, 3, 0x78c0e7, 0.9);
          this.homeTapEffectLayer.add(splash);
          this.tweens.add({
            targets: splash,
            alpha: 0,
            scaleX: 1.4,
            scaleY: 0.78,
            duration: 170,
            ease: "Sine.Out",
            onComplete: () => {
              splash.destroy();
            }
          });
          drop.destroy();
        }
      });
    }
  }

  private upgradeTapPower(): void {
    if (this.saveData.clicker.tapUpgradeLevel >= CLICKER_MAX_UPGRADE_LEVEL) {
      this.showToast("탭 파워는 최대 레벨입니다.");
      return;
    }
    const cost = getTapUpgradeCost(this.saveData.clicker.tapUpgradeLevel);
    this.applyMutation(
      (draft) => {
        if (draft.player.coins < cost) {
          return false;
        }
        draft.player.coins = clampCoins(draft.player.coins - cost);
        draft.clicker.tapPower += 1;
        draft.clicker.tapUpgradeLevel += 1;
        return true;
      },
      "탭 가속 강화 성공",
      "코인이 부족합니다."
    );
  }

  private upgradeAutoCoins(): void {
    if (this.saveData.clicker.autoUpgradeLevel >= CLICKER_MAX_UPGRADE_LEVEL) {
      this.showToast("자동 코인은 최대 레벨입니다.");
      return;
    }
    const cost = getAutoUpgradeCost(this.saveData.clicker.autoUpgradeLevel);
    this.applyMutation(
      (draft) => {
        if (draft.player.coins < cost) {
          return false;
        }
        draft.player.coins = clampCoins(draft.player.coins - cost);
        draft.clicker.autoCoinsPerSec += 1;
        draft.clicker.autoUpgradeLevel += 1;
        return true;
      },
      "자동 코인 강화 성공",
      "코인이 부족합니다."
    );
  }

  private upgradeGrowthBoost(): void {
    if (this.saveData.clicker.boostUpgradeLevel >= CLICKER_MAX_UPGRADE_LEVEL) {
      this.showToast("성장 부스트는 최대 레벨입니다.");
      return;
    }
    const cost = getBoostUpgradeCost(this.saveData.clicker.boostUpgradeLevel);
    this.applyMutation(
      (draft) => {
        if (draft.player.coins < cost) {
          return false;
        }
        draft.player.coins = clampCoins(draft.player.coins - cost);
        draft.clicker.growthBoostSeconds += 1;
        draft.clicker.boostUpgradeLevel += 1;
        return true;
      },
      "성장 부스트 강화 성공",
      "코인이 부족합니다."
    );
  }

  private buyRandomSeed(): void {
    if (getSeedCapacity(this.saveData.inventory.seedCounts) <= 0) {
      this.showToast(`씨앗 보유량이 최대(${MAX_TOTAL_SEEDS})입니다.`);
      return;
    }

    this.applyMutation(
      (draft) => {
        if (draft.player.coins < RANDOM_SEED_SHOP_PRICE || getSeedCapacity(draft.inventory.seedCounts) <= 0) {
          return false;
        }

        const grantedCount = this.grantRandomSeedRewards(draft.inventory.seedCounts, 1);
        if (grantedCount <= 0) {
          return false;
        }
        draft.player.coins = clampCoins(draft.player.coins - RANDOM_SEED_SHOP_PRICE);
        return true;
      },
      "랜덤 씨앗 x1 구매",
      "구매할 수 없습니다."
    );
  }

  private buySeed(speciesId: string): void {
    const species = PLANT_BY_ID[speciesId];
    if (!species) {
      return;
    }
    if (getSeedCapacity(this.saveData.inventory.seedCounts) <= 0) {
      this.showToast(`씨앗 보유량이 최대(${MAX_TOTAL_SEEDS})입니다.`);
      return;
    }

    this.applyMutation(
      (draft) => {
        if (draft.player.coins < species.seedPrice || getSeedCapacity(draft.inventory.seedCounts) <= 0) {
          return false;
        }

        draft.player.coins = clampCoins(draft.player.coins - species.seedPrice);
        draft.inventory.seedCounts[species.id] = Math.max(0, Math.floor(draft.inventory.seedCounts[species.id] ?? 0)) + 1;
        return true;
      },
      `${species.nameKo} 씨앗 구매`,
      "구매할 수 없습니다."
    );
  }

  private buyPot(potId: string): void {
    const pot = POT_BY_ID[potId];
    if (!pot) {
      return;
    }

    this.applyMutation(
      (draft) => {
        if (draft.collection.ownedPotIds.includes(pot.id)) {
          return false;
        }
        if (draft.player.coins < pot.price) {
          return false;
        }

        draft.player.coins = clampCoins(draft.player.coins - pot.price);
        draft.collection.ownedPotIds.push(pot.id);
        return true;
      },
      `${pot.nameKo} 구매`,
      "구매할 수 없습니다."
    );
  }

  private buyBackground(backgroundId: string): void {
    const background = BACKGROUND_BY_ID[backgroundId];
    if (!background) {
      return;
    }

    this.applyMutation(
      (draft) => {
        if (draft.collection.ownedBackgroundIds.includes(background.id)) {
          return false;
        }
        if (draft.player.coins < background.price) {
          return false;
        }

        draft.player.coins = clampCoins(draft.player.coins - background.price);
        draft.collection.ownedBackgroundIds.push(background.id);
        return true;
      },
      `${background.nameKo} 배경 구매`,
      "구매할 수 없습니다."
    );
  }

  private equipCustomizePot(potId: string): void {
    if (!this.saveData.collection.ownedPotIds.includes(potId)) {
      this.showToast("화분을 먼저 구매하세요.");
      return;
    }

    this.applyMutation(
      (draft) => {
        if (!draft.collection.ownedPotIds.includes(potId)) {
          return false;
        }
        if (draft.garden.slots.every((slot) => slot.potId === potId)) {
          return false;
        }
        draft.garden.slots.forEach((slot) => {
          slot.potId = potId;
        });
        return true;
      },
      "화분 적용 완료",
      "이미 적용된 화분입니다."
    );
  }

  private equipBackground(backgroundId: string): void {
    if (!this.saveData.collection.ownedBackgroundIds.includes(backgroundId)) {
      this.showToast("배경을 먼저 구매하세요.");
      return;
    }

    this.applyMutation(
      (draft) => {
        if (draft.garden.backgroundId === backgroundId) {
          return false;
        }
        draft.garden.backgroundId = backgroundId;
        return true;
      },
      "배경 적용 완료"
    );
  }

  private playSeedDropAnimation(): void {
    const seedStartX = CLICKER_CENTER_X;
    const seedTargetY = this.getHomeWaterLandingWorldY() - 10;
    const seedStartY = seedTargetY - SEED_DROP_START_OFFSET_Y;
    const selectedSeedTextureKey = this.textures.exists(SEED_DROP_TEXTURE_KEY) ? SEED_DROP_TEXTURE_KEY : null;

    const seed = selectedSeedTextureKey
      ? this.add
          .image(seedStartX, seedStartY, selectedSeedTextureKey)
          .setDisplaySize(SEED_DROP_DISPLAY_WIDTH, SEED_DROP_DISPLAY_HEIGHT)
      : this.add.ellipse(seedStartX, seedStartY, 14, 18, 0xe9be72).setStrokeStyle(2, 0xa66f30);
    seed.setAlpha(0.98).setAngle(Phaser.Math.Between(-4, 4));
    this.toastLayer.add(seed);

    this.tweens.add({
      targets: seed,
      y: seedTargetY,
      duration: 520,
      ease: "Quad.In",
      onComplete: () => {
        this.tweens.add({
          targets: seed,
          y: seedTargetY + 10,
          alpha: 0,
          duration: 220,
          ease: "Sine.In",
          onComplete: () => {
            seed.destroy();
          }
        });
      }
    });
  }

  private getHomeWaterLandingY(): number {
    return CLICKER_CENTER_Y + 23;
  }

  private getHomeWaterLandingWorldY(): number {
    const homeTapLayerOffsetY = this.homeTapEffectLayer?.y ?? 84;
    return this.getHomeWaterLandingY() + homeTapLayerOffsetY;
  }

  private plantToSelectedSlot(): void {
    const slot = this.getSelectedSlot();
    const species = this.getRandomPlantSpecies();
    if (!species) {
      this.showToast("보유한 씨앗이 없습니다.", "seed");
      return;
    }

    if (!slot) {
      this.showToast("화분 정보를 불러오지 못했습니다.");
      return;
    }

    const planted = this.applyMutation(
      (draft) => {
        const draftSlot = draft.garden.slots.find((candidate) => candidate.slotId === slot.slotId);
        if (!draftSlot || draftSlot.planted) {
          return false;
        }
        const currentSeedCount = Math.max(0, Math.floor(draft.inventory.seedCounts[species.id] ?? 0));
        if (currentSeedCount <= 0) {
          return false;
        }
        draft.inventory.seedCounts[species.id] = currentSeedCount - 1;
        draftSlot.planted = {
          speciesId: species.id,
          plantedAt: Date.now(),
          growSeconds: species.growSeconds,
          harvested: false
        };
        return true;
      },
      undefined,
      "화분이 비어있거나 씨앗이 부족합니다."
    );

    if (planted) {
      this.playSeedDropAnimation();
    }
  }

  private harvestSelectedSlot(): void {
    const slot = this.getSelectedSlot();
    if (!slot?.planted) {
      this.showToast("수확할 식물이 없습니다.");
      return;
    }

    const species = PLANT_BY_ID[slot.planted.speciesId] ?? AVAILABLE_PLANT_SPECIES_DEFS[0] ?? PLANT_SPECIES_DEFS[0];

    const harvested = this.applyMutation(
      (draft) => {
        const draftSlot = draft.garden.slots.find((candidate) => candidate.slotId === slot.slotId);
        if (!draftSlot?.planted) {
          return false;
        }

        if (!isPlantHarvestable(draftSlot.planted, Date.now())) {
          return false;
        }

        draft.player.coins = clampCoins(draft.player.coins + species.rewardCoins);
        if (!draft.collection.discoveredSpeciesIds.includes(species.id)) {
          draft.collection.discoveredSpeciesIds.push(species.id);
        }
        draft.collection.flowerCounts[species.id] = 1;
        draft.decor.displayFlowerCounts[species.id] = 1;
        this.autoPlaceSpeciesIntoDecorDisplay(draft, species.id);
        draftSlot.planted = null;
        return true;
      },
      undefined,
      "아직 수확 가능한 상태가 아닙니다."
    );

    if (harvested) {
      this.playHomeHarvestCelebrationEffects(species);
      this.time.delayedCall(280, () => {
        this.promptForPlantNickname(species.id);
      });
    }
  }

  private sanitizePlantNickname(rawValue: string): string {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return "";
    }
    return Array.from(trimmed).slice(0, MAX_PLANT_NICKNAME_LENGTH).join("");
  }

  private promptForPlantNickname(speciesId: string): void {
    const species = PLANT_BY_ID[speciesId];
    if (!species) {
      return;
    }
    this.openHarvestNicknameModal(species);
  }

  private openHarvestNicknameModal(species: PlantSpeciesDef): void {
    this.closeHarvestNicknameModal();

    const modal = this.add.container(0, 0);
    this.harvestNicknameModal = modal;
    this.modalLayer.add(modal);
    const modalCenterX = 195;
    const modalCenterY = 422;
    const imageAreaY = 354;
    const imageAreaWidth = 236;
    const imageAreaHeight = 128;
    const imageContentMaxWidth = 176;
    const imageContentMaxHeight = 118;
    const titleY = 281;
    const inputBoxY = 468;
    const harvestGuideY = 430;
    const guideTextY = 498;
    const buttonY = 542;

    const dismissModal = (): void => {
      this.closeHarvestNicknameModal();
    };

    const submitNickname = (): void => {
      const rawNickname = this.harvestNicknameInputElement?.value ?? "";
      const nickname = this.sanitizePlantNickname(rawNickname);
      this.closeHarvestNicknameModal();
      this.applyMutation(
        (draft) => {
          draft.collection.plantNicknames[species.id] = nickname;
          return true;
        },
        nickname ? `${species.nameKo} 이름 저장: ${nickname}` : `${species.nameKo} 이름표를 기본명으로 설정`,
        undefined
      );
    };

    const scrim = this.add
      .rectangle(modalCenterX, modalCenterY, 390, 844, 0x1d241f, 0.62)
      .setInteractive({ useHandCursor: true });
    scrim.on("pointerup", () => {
      // Swallow pointer events so the modal behaves like a blocking dialog.
    });
    modal.add(scrim);

    modal.add(this.add.rectangle(modalCenterX, modalCenterY, 336, 332, 0xfff8eb, 0.99).setStrokeStyle(2, 0xb79f79, 0.95));
    modal.add(
      this.add
        .rectangle(modalCenterX, imageAreaY, imageAreaWidth, imageAreaHeight, 0xddd0b8, 0.95)
        .setStrokeStyle(2, 0xc8b38d, 0.9)
    );

    const detailCutoutTextureKey = getCollectionFlowerCutoutTextureKey(species.id);
    const detailSourceTextureKey = getCollectionFlowerTextureKey(species.id);
    if (this.textures.exists(detailCutoutTextureKey)) {
      this.addContainedImage(
        modal,
        detailCutoutTextureKey,
        modalCenterX,
        imageAreaY,
        imageContentMaxWidth,
        imageContentMaxHeight
      );
    } else if (this.textures.exists(detailSourceTextureKey)) {
      this.addContainedImage(
        modal,
        detailSourceTextureKey,
        modalCenterX,
        imageAreaY,
        imageContentMaxWidth,
        imageContentMaxHeight
      );
    }

    const harvestTitleText = this.add
      .text(modalCenterX, titleY, `${species.nameKo}`, {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "23px",
        color: "#3c4034",
        fontStyle: "700"
      })
      .setOrigin(0.5);
    const harvestTitleBgWidth = Math.max(152, Math.ceil(harvestTitleText.width + 28));
    modal.add(
      this.add
        .rectangle(modalCenterX, titleY, harvestTitleBgWidth, 36, 0xeee3cc, 0.98)
        .setStrokeStyle(2, 0xb79f79, 0.92)
    );
    modal.add(this.add.rectangle(modalCenterX, titleY - 5, Math.max(72, harvestTitleBgWidth - 14), 4, 0xffffff, 0.23));
    modal.add(harvestTitleText);

    modal.add(
      this.add
        .text(modalCenterX, harvestGuideY, `${species.nameKo} 수확 +${species.rewardCoins} 코인`, {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#5a5d50",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );

    modal.add(this.add.rectangle(modalCenterX, inputBoxY, 218, 36, 0xf9f7ef, 0.98).setStrokeStyle(2, 0xb8aa8d, 0.94));
    modal.add(
      this.add
        .text(modalCenterX, guideTextY, "식물 이름을 지어주세요 (최대 5글자)", {
          fontFamily: "Pretendard, sans-serif",
          fontSize: "13px",
          color: "#5a5d50",
          fontStyle: "700"
        })
        .setOrigin(0.5)
    );

    this.addButton(modal, 140, buttonY, 116, 34, "저장", submitNickname, {
      fillColor: 0x5f8a54,
      textColor: "#ffffff",
      fontSize: 13
    });
    this.addButton(modal, 250, buttonY, 116, 34, "건너뛰기", dismissModal, {
      fillColor: 0x7d735f,
      textColor: "#ffffff",
      fontSize: 13
    });

    const inputElement = this.createHarvestNicknameInputElement(this.saveData.collection.plantNicknames[species.id] ?? "");
    if (!inputElement) {
      this.closeHarvestNicknameModal();
      const fallbackInput = window.prompt(
        `[수확 완료] ${species.nameKo}\n정원에서 표시할 이름을 입력하세요. (최대 ${MAX_PLANT_NICKNAME_LENGTH}글자)\n비워두면 기본 이름으로 표시됩니다.`,
        this.saveData.collection.plantNicknames[species.id] ?? ""
      );
      if (fallbackInput === null) {
        return;
      }
      const nickname = this.sanitizePlantNickname(fallbackInput);
      this.applyMutation(
        (draft) => {
          draft.collection.plantNicknames[species.id] = nickname;
          return true;
        },
        nickname ? `${species.nameKo} 이름 저장: ${nickname}` : `${species.nameKo} 이름표를 기본명으로 설정`,
        undefined
      );
      return;
    }

    inputElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitNickname();
      } else if (event.key === "Escape") {
        event.preventDefault();
        dismissModal();
      }
    });
  }

  private createHarvestNicknameInputElement(initialValue: string): HTMLInputElement | null {
    if (typeof document === "undefined") {
      return null;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.value = this.sanitizePlantNickname(initialValue);
    input.placeholder = "이름 입력";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.style.position = "fixed";
    input.style.zIndex = "9999";
    input.style.border = "2px solid #8d7f66";
    input.style.borderRadius = "8px";
    input.style.padding = "6px 10px";
    input.style.fontSize = "15px";
    input.style.fontWeight = "700";
    input.style.background = "#fffef8";
    input.style.color = "#3f4338";
    input.style.outline = "none";
    input.style.textAlign = "center";
    input.style.boxSizing = "border-box";

    this.layoutHarvestNicknameInputElement(input);

    const limitInputLength = (): void => {
      const normalized = Array.from(input.value).slice(0, MAX_PLANT_NICKNAME_LENGTH).join("");
      if (input.value !== normalized) {
        input.value = normalized;
      }
    };
    const handleResize = (): void => {
      this.layoutHarvestNicknameInputElement(input);
    };

    input.addEventListener("input", limitInputLength);
    window.addEventListener("resize", handleResize);

    document.body.appendChild(input);
    this.harvestNicknameInputElement = input;
    this.harvestNicknameInputDisposer = () => {
      input.removeEventListener("input", limitInputLength);
      window.removeEventListener("resize", handleResize);
      input.remove();
      this.harvestNicknameInputElement = null;
      this.harvestNicknameInputDisposer = null;
    };

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    return input;
  }

  private layoutHarvestNicknameInputElement(input: HTMLInputElement): void {
    const canvas = this.game.canvas as HTMLCanvasElement | undefined;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const width = (214 / 390) * rect.width;
    const height = (34 / 844) * rect.height;
    const centerX = rect.left + (195 / 390) * rect.width;
    const centerY = rect.top + (468 / 844) * rect.height;
    input.style.left = `${Math.round(centerX - width / 2)}px`;
    input.style.top = `${Math.round(centerY - height / 2)}px`;
    input.style.width = `${Math.max(110, Math.round(width))}px`;
    input.style.height = `${Math.max(26, Math.round(height))}px`;
  }

  private closeHarvestNicknameModal(): void {
    if (this.harvestNicknameInputDisposer) {
      this.harvestNicknameInputDisposer();
    }
    if (this.harvestNicknameModal) {
      this.harvestNicknameModal.destroy(true);
      this.harvestNicknameModal = null;
    }
  }

  private shiftSelectedSlotPot(step: -1 | 1): void {
    const slot = this.getSelectedSlot();
    if (!slot) {
      this.showToast("화분 정보를 불러오지 못했습니다.");
      return;
    }

    this.applyMutation(
      (draft) => {
        const owned = draft.collection.ownedPotIds;
        if (owned.length <= 1) {
          return false;
        }

        const draftSlot = draft.garden.slots.find((candidate) => candidate.slotId === slot.slotId);
        if (!draftSlot) {
          return false;
        }

        const currentIndex = Math.max(0, owned.indexOf(draftSlot.potId));
        const nextPotId = owned[(currentIndex + step + owned.length) % owned.length];
        draftSlot.potId = nextPotId;
        return true;
      },
      "화분을 변경했습니다.",
      "보유한 화분이 부족합니다."
    );
  }

  private cycleSelectedSlotPot(): void {
    this.shiftSelectedSlotPot(1);
  }

  private shiftHomeBackground(step: -1 | 1): void {
    this.applyMutation(
      (draft) => {
        const ownedBackgroundIds = draft.collection.ownedBackgroundIds.filter((backgroundId) => Boolean(BACKGROUND_BY_ID[backgroundId]));
        if (ownedBackgroundIds.length <= 1) {
          return false;
        }
        const currentIndex = Math.max(0, ownedBackgroundIds.indexOf(draft.garden.backgroundId));
        draft.garden.backgroundId = ownedBackgroundIds[(currentIndex + step + ownedBackgroundIds.length) % ownedBackgroundIds.length];
        return true;
      },
      "배경을 변경했습니다.",
      "보유한 배경이 부족합니다."
    );
  }

  private cycleHomeBackground(): void {
    this.shiftHomeBackground(1);
  }

  private getSelectedSlot(): GardenSlotState | null {
    return this.saveData.garden.slots[0] ?? null;
  }

  private getTapGrowthBoostSeconds(data: SaveDataV1 = this.saveData): number {
    const tapPower = Math.max(1, Math.floor(data.clicker.tapPower));
    const baseGrowthBoost = Math.max(1, Math.floor(data.clicker.growthBoostSeconds));
    return baseGrowthBoost + tapPower - 1;
  }

  private getRandomPlantSpecies(data: SaveDataV1 = this.saveData): PlantSpeciesDef | null {
    const activeSpecies = getActiveGrowableSpecies().filter(
      (species) => Math.max(0, Math.floor(data.inventory.seedCounts[species.id] ?? 0)) > 0
    );
    if (activeSpecies.length <= 0) {
      return null;
    }
    return Phaser.Utils.Array.GetRandom(activeSpecies) ?? null;
  }

  private sanitizeRuntimeData(data: SaveDataV1): void {
    const defaultPotId = POT_DEFS[0]?.id ?? "pot_clay";
    const defaultBackgroundId =
      BACKGROUND_DEFS.find((background) => background.id === "bg_sunset")?.id ?? BACKGROUND_DEFS[0]?.id ?? "bg_sunset";

    data.collection.discoveredSpeciesIds = Array.from(
      new Set(data.collection.discoveredSpeciesIds.filter((speciesId) => AVAILABLE_PLANT_SPECIES_ID_SET.has(speciesId)))
    );
    data.collection.ownedPotIds = Array.from(new Set(data.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]))));
    data.collection.ownedBackgroundIds = Array.from(
      new Set(
        data.collection.ownedBackgroundIds.filter(
          (backgroundId) =>
            Boolean(BACKGROUND_BY_ID[backgroundId]) &&
            backgroundId !== HOME_WINDOW_FRAME_BACKGROUND_ID &&
            backgroundId !== "bg_window2"
        )
      )
    );
    const rawClaimedSetRewardIds = Array.isArray(data.collection.claimedSetRewardIds)
      ? data.collection.claimedSetRewardIds
      : [];
    data.collection.claimedSetRewardIds = Array.from(
      new Set(
        rawClaimedSetRewardIds
          .filter((setId): setId is string => typeof setId === "string")
          .filter((setId) => COLLECTION_SET_REWARD_ID_SET.has(setId))
      )
    );

    if (data.collection.ownedPotIds.length === 0) {
      data.collection.ownedPotIds.push(defaultPotId);
    }

    if (data.collection.ownedBackgroundIds.length === 0) {
      data.collection.ownedBackgroundIds.push(defaultBackgroundId);
    }

    if (!data.collection.ownedBackgroundIds.includes(defaultBackgroundId)) {
      data.collection.ownedBackgroundIds.unshift(defaultBackgroundId);
    }

    if (data.garden.backgroundId === "bg_meadow" || data.garden.backgroundId === "bg_window2") {
      data.garden.backgroundId = defaultBackgroundId;
    }

    if (!data.collection.ownedBackgroundIds.includes(data.garden.backgroundId)) {
      data.garden.backgroundId = data.collection.ownedBackgroundIds[0];
    }

    if (data.garden.slots.length < GARDEN_SLOT_COUNT) {
      for (let index = data.garden.slots.length; index < GARDEN_SLOT_COUNT; index += 1) {
        data.garden.slots.push({
          slotId: `slot-${String(index + 1).padStart(2, "0")}`,
          potId: defaultPotId,
          planted: null
        });
      }
    }

    if (data.garden.slots.length > GARDEN_SLOT_COUNT) {
      data.garden.slots = data.garden.slots.slice(0, GARDEN_SLOT_COUNT);
    }

    data.garden.slots.forEach((slot, index) => {
      if (!slot.slotId) {
        slot.slotId = `slot-${String(index + 1).padStart(2, "0")}`;
      }
      if (!data.collection.ownedPotIds.includes(slot.potId)) {
        slot.potId = data.collection.ownedPotIds[0];
      }
    });

    const primarySlot = data.garden.slots[0];
    if (primarySlot) {
      if (!primarySlot.planted) {
        const legacyPlantedSlot = data.garden.slots.slice(1).find((slot) => slot.planted);
        if (legacyPlantedSlot?.planted) {
          primarySlot.planted = legacyPlantedSlot.planted;
          legacyPlantedSlot.planted = null;
        }
      }

      for (let index = 1; index < data.garden.slots.length; index += 1) {
        data.garden.slots[index].planted = null;
      }
    }

    const normalizedSeedCounts: Record<string, number> = {};
    let remainingSeedCapacity = MAX_TOTAL_SEEDS;
    const rawPlantNicknames = data.collection.plantNicknames;
    data.collection.plantNicknames = {};

    for (const species of AVAILABLE_PLANT_SPECIES_DEFS) {
      const seedCount = data.inventory.seedCounts[species.id] ?? 0;
      const normalizedSeedCount = Math.max(0, Math.floor(seedCount));
      const cappedSeedCount = Math.min(normalizedSeedCount, remainingSeedCapacity);
      normalizedSeedCounts[species.id] = cappedSeedCount;
      remainingSeedCapacity -= cappedSeedCount;

      const flowerCount = Math.min(1, Math.max(0, Math.floor(data.collection.flowerCounts[species.id] ?? 0)));
      const displayCount = Math.min(1, Math.max(0, Math.floor(data.decor.displayFlowerCounts[species.id] ?? 0)));
      data.collection.flowerCounts[species.id] = flowerCount;
      data.decor.displayFlowerCounts[species.id] = displayCount;
      data.collection.plantNicknames[species.id] = this.sanitizePlantNickname(rawPlantNicknames[species.id] ?? "");
      if ((flowerCount > 0 || displayCount > 0) && !data.collection.discoveredSpeciesIds.includes(species.id)) {
        data.collection.discoveredSpeciesIds.push(species.id);
      }
    }
    data.inventory.seedCounts = normalizedSeedCounts;

    const rawDisplaySlots = Array.isArray(data.decor.displaySlots) ? data.decor.displaySlots : [];
    const rawDisplaySlotMap = new Map<string, DecorDisplaySlotState>();
    for (const slot of rawDisplaySlots) {
      if (!slot || typeof slot.slotId !== "string") {
        continue;
      }
      const rawPage = typeof slot.page === "number" && Number.isFinite(slot.page) ? Math.floor(slot.page) : 0;
      if (rawPage < 0 || rawPage >= DECOR_DISPLAY_PAGE_COUNT) {
        continue;
      }
      rawDisplaySlotMap.set(`${rawPage}:${slot.slotId}`, slot);
    }

    data.decor.displaySlots = [];
    for (let pageIndex = 0; pageIndex < DECOR_DISPLAY_PAGE_COUNT; pageIndex += 1) {
      for (const layout of DECOR_DISPLAY_SLOT_LAYOUT) {
        const rawSlot = rawDisplaySlotMap.get(`${pageIndex}:${layout.slotId}`);
        const rawSpeciesId = rawSlot?.speciesId;
        const speciesId =
          typeof rawSpeciesId === "string" && AVAILABLE_PLANT_SPECIES_ID_SET.has(rawSpeciesId) ? rawSpeciesId : null;
        const rawPotId = rawSlot?.potId;
        const validPotId = typeof rawPotId === "string" && POT_BY_ID[rawPotId] ? rawPotId : defaultPotId;
        const potId = data.collection.ownedPotIds.includes(validPotId) ? validPotId : data.collection.ownedPotIds[0] ?? defaultPotId;
        if (speciesId && !data.collection.discoveredSpeciesIds.includes(speciesId)) {
          data.collection.discoveredSpeciesIds.push(speciesId);
        }
        data.decor.displaySlots.push({
          slotId: layout.slotId,
          layer: layout.layer,
          page: pageIndex,
          potId,
          speciesId
        });
      }
    }
    const placedSpeciesIds = new Set<string>();
    for (const slot of data.decor.displaySlots) {
      if (!slot.speciesId) {
        continue;
      }
      if (placedSpeciesIds.has(slot.speciesId)) {
        slot.speciesId = null;
        continue;
      }
      placedSpeciesIds.add(slot.speciesId);
    }
    for (const species of AVAILABLE_PLANT_SPECIES_DEFS) {
      const speciesId = species.id;
      const isPlaced = placedSpeciesIds.has(speciesId);
      const hasFlowerOwnership =
        data.collection.discoveredSpeciesIds.includes(speciesId) ||
        Math.min(1, Math.max(0, Math.floor(data.collection.flowerCounts[speciesId] ?? 0))) > 0 ||
        Math.min(1, Math.max(0, Math.floor(data.decor.displayFlowerCounts[speciesId] ?? 0))) > 0 ||
        isPlaced;

      data.collection.flowerCounts[speciesId] = hasFlowerOwnership ? 1 : 0;
      data.decor.displayFlowerCounts[speciesId] = hasFlowerOwnership && !isPlaced ? 1 : 0;

      if (hasFlowerOwnership && !data.collection.discoveredSpeciesIds.includes(speciesId)) {
        data.collection.discoveredSpeciesIds.push(speciesId);
      }
    }

    data.player.coins = clampCoins(data.player.coins);
    data.player.gems = clampGems(data.player.gems);
    if (!data.decor.goalReward || typeof data.decor.goalReward !== "object") {
      data.decor.goalReward = {
        lastClaimedPeriodKey: null,
        claimedTier: 0
      };
    }
    data.decor.goalReward.lastClaimedPeriodKey =
      typeof data.decor.goalReward.lastClaimedPeriodKey === "string" &&
      data.decor.goalReward.lastClaimedPeriodKey.trim().length > 0
        ? data.decor.goalReward.lastClaimedPeriodKey
        : null;
    const normalizedGoalClaimedTier = Number(data.decor.goalReward.claimedTier);
    data.decor.goalReward.claimedTier = Phaser.Math.Clamp(
      Number.isFinite(normalizedGoalClaimedTier) ? Math.floor(normalizedGoalClaimedTier) : 0,
      0,
      DECOR_SCORE_REWARD_TIERS.length
    );
    data.attendance.cycleDay = Phaser.Math.Clamp(Math.floor(data.attendance.cycleDay), 0, 6);
    if (typeof data.attendance.lastClaimedPeriodKey !== "string" || data.attendance.lastClaimedPeriodKey.trim().length === 0) {
      data.attendance.lastClaimedPeriodKey = null;
    }
    const rawUnlockClaimedDays = Array.isArray(data.attendance.unlockClaimedDays) ? data.attendance.unlockClaimedDays : [];
    data.attendance.unlockClaimedDays = Array.from(
      new Set(
        rawUnlockClaimedDays
          .map((day) => Math.floor(Number(day)))
          .filter((day) => Number.isFinite(day) && day >= 1 && day <= 7)
      )
    ).sort((a, b) => a - b);
    data.clicker.tapUpgradeLevel = Phaser.Math.Clamp(Math.floor(data.clicker.tapUpgradeLevel), 1, CLICKER_MAX_UPGRADE_LEVEL);
    data.clicker.autoUpgradeLevel = Phaser.Math.Clamp(Math.floor(data.clicker.autoUpgradeLevel), 0, CLICKER_MAX_UPGRADE_LEVEL);
    data.clicker.boostUpgradeLevel = Phaser.Math.Clamp(Math.floor(data.clicker.boostUpgradeLevel), 1, CLICKER_MAX_UPGRADE_LEVEL);
    data.clicker.tapPower = data.clicker.tapUpgradeLevel;
    data.clicker.autoCoinsPerSec = data.clicker.autoUpgradeLevel;
    data.clicker.growthBoostSeconds = data.clicker.boostUpgradeLevel + 1;
    data.settings.homePotTintIndex = 0;
    data.settings.homeWindowOpen = typeof data.settings.homeWindowOpen === "boolean" ? data.settings.homeWindowOpen : true;

    const seenDecorIds = new Set<string>();
    let nextDecorId = Math.max(1, Math.floor(data.decor.nextItemId));
    let maxDecorNumericId = 0;
    const sanitizedDecorItems: DecorPlacement[] = [];

    const reserveDecorId = (candidateId: string): string => {
      const trimmed = candidateId.trim();
      if (trimmed.length > 0 && !seenDecorIds.has(trimmed)) {
        seenDecorIds.add(trimmed);
        const parsed = /^decor-(\d+)$/.exec(trimmed);
        if (parsed) {
          maxDecorNumericId = Math.max(maxDecorNumericId, Number(parsed[1]));
        }
        return trimmed;
      }

      while (seenDecorIds.has(`decor-${nextDecorId}`)) {
        nextDecorId += 1;
      }
      const generatedId = `decor-${nextDecorId}`;
      nextDecorId += 1;
      seenDecorIds.add(generatedId);
      maxDecorNumericId = Math.max(maxDecorNumericId, nextDecorId - 1);
      return generatedId;
    };

    for (const decorItem of data.decor.items) {
      if (decorItem.itemType === "flower") {
        if (!AVAILABLE_PLANT_SPECIES_ID_SET.has(decorItem.refId) || !data.collection.discoveredSpeciesIds.includes(decorItem.refId)) {
          continue;
        }
      } else if (decorItem.itemType === "pot") {
        if (!POT_BY_ID[decorItem.refId] || !data.collection.ownedPotIds.includes(decorItem.refId)) {
          continue;
        }
      } else {
        continue;
      }

      const snappedPoint = this.getNearestDecorGridPoint(
        Phaser.Math.Clamp(Math.floor(decorItem.x), DECOR_MIN_X, DECOR_MAX_X),
        Phaser.Math.Clamp(Math.floor(decorItem.y), DECOR_MIN_Y, DECOR_MAX_Y)
      );
      sanitizedDecorItems.push({
        id: reserveDecorId(decorItem.id),
        itemType: decorItem.itemType,
        refId: decorItem.refId,
        x: snappedPoint.x,
        y: snappedPoint.y
      });
    }

    data.decor.items = sanitizedDecorItems;
    data.decor.nextItemId = Math.max(1, nextDecorId, maxDecorNumericId + 1);

    const availableDecorFlowerIds = AVAILABLE_PLANT_SPECIES_DEFS.map((species) => species.id).filter(
      (speciesId) =>
        Boolean(PLANT_BY_ID[speciesId]) &&
        Math.min(1, Math.max(0, Math.floor(data.decor.displayFlowerCounts[speciesId] ?? 0))) > 0 &&
        !data.decor.displaySlots.some((slot) => slot.speciesId === speciesId)
    );
    if (availableDecorFlowerIds.length > 0) {
      if (
        !AVAILABLE_PLANT_SPECIES_ID_SET.has(this.selectedDecorFlowerId) ||
        (!this.isDecorEditMode && !availableDecorFlowerIds.includes(this.selectedDecorFlowerId))
      ) {
        this.selectedDecorFlowerId = availableDecorFlowerIds[0];
      }
    } else if (!AVAILABLE_PLANT_SPECIES_ID_SET.has(this.selectedDecorFlowerId)) {
      this.selectedDecorFlowerId = "";
    }

    const availableDecorPotIds = data.collection.ownedPotIds.filter((potId) => Boolean(POT_BY_ID[potId]));
    if (availableDecorPotIds.length > 0) {
      if (!availableDecorPotIds.includes(this.selectedDecorPotId)) {
        this.selectedDecorPotId = availableDecorPotIds[0];
      }
      if (!availableDecorPotIds.includes(this.selectedCustomizePotId)) {
        this.selectedCustomizePotId = availableDecorPotIds[0];
      }
    } else {
      this.selectedDecorPotId = "";
      this.selectedCustomizePotId = "";
    }

    const availableBackgroundIds = data.collection.ownedBackgroundIds.filter((backgroundId) => Boolean(BACKGROUND_BY_ID[backgroundId]));
    if (availableBackgroundIds.length > 0) {
      if (!availableBackgroundIds.includes(this.selectedCustomizeBackgroundId)) {
        if (availableBackgroundIds.includes(data.garden.backgroundId)) {
          this.selectedCustomizeBackgroundId = data.garden.backgroundId;
        } else {
          this.selectedCustomizeBackgroundId = availableBackgroundIds[0];
        }
      }
    } else {
      this.selectedCustomizeBackgroundId = "";
    }

    if (!this.selectedDecorItemId || !data.decor.items.some((item) => item.id === this.selectedDecorItemId)) {
      this.selectedDecorItemId = null;
    }
    this.decorPageIndex = Phaser.Math.Clamp(this.decorPageIndex, 0, DECOR_DISPLAY_PAGE_COUNT - 1);
    const activeDisplaySlots = this.getDecorDisplaySlotsForPage(this.decorPageIndex, data);
    if (!this.selectedDecorSlotId || !activeDisplaySlots.some((slot) => slot.slotId === this.selectedDecorSlotId)) {
      this.selectedDecorSlotId = null;
    }
  }

  private applyMutation(mutator: (draft: SaveDataV1) => boolean, successMessage?: string, failMessage?: string): boolean {
    const draft = structuredClone(this.saveData) as SaveDataV1;
    const changed = mutator(draft);

    if (!changed) {
      if (failMessage) {
        this.showToast(failMessage);
      }
      return false;
    }

    draft.player.lastActiveAt = Date.now();
    this.sanitizeRuntimeData(draft);

    this.saveData = draft;
    this.saveRepository.saveDebounced(this.saveData);
    this.renderAll();

    if (successMessage) {
      this.showToast(successMessage);
    }

    return true;
  }

  private showToast(message: string, position: "bottom" | "center" | "seed" = "bottom"): void {
    this.toastLayer.removeAll(true);

    const toastY =
      position === "center"
        ? 350
        : position === "seed"
          ? this.getHomeWaterLandingWorldY() - 10
          : 718;
    const backdrop = this.add.rectangle(195, toastY, 354, 44, 0x2f3d31, 0.9).setStrokeStyle(1, 0x5f8260, 0.9);
    const text = this.add
      .text(195, toastY, message, {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "13px",
        color: "#eef8ee"
      })
      .setOrigin(0.5);

    this.toastLayer.add([backdrop, text]);

    if (this.toastTimer) {
      this.toastTimer.remove(false);
    }

    this.toastTimer = this.time.delayedCall(2400, () => {
      this.toastLayer.removeAll(true);
    });
  }

  private addMobileCloseButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    onClick: () => void
  ): void {
    const background = this.add.circle(x, y, 19, 0x2d332c, 0.86).setStrokeStyle(2, 0xf1efe4, 0.94);
    const shine = this.add.circle(x - 5, y - 6, 5, 0xffffff, 0.24);
    const slashA = this.add.rectangle(x, y, 13, 2.8, 0xf7f6ef).setAngle(45);
    const slashB = this.add.rectangle(x, y, 13, 2.8, 0xf7f6ef).setAngle(-45);
    const hitArea = this.add.circle(x, y, 22, 0xffffff, 0.001).setInteractive({ useHandCursor: true });

    hitArea.on("pointerup", () => {
      onClick();
    });
    hitArea.on("pointerover", () => {
      background.setScale(1.07);
      shine.setScale(1.07);
      slashA.setScale(1.07);
      slashB.setScale(1.07);
    });
    hitArea.on("pointerout", () => {
      background.setScale(1);
      shine.setScale(1);
      slashA.setScale(1);
      slashB.setScale(1);
    });

    parent.add([background, shine, slashA, slashB, hitArea]);
  }

  private addCollectionCloseButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    onClick: () => void
  ): void {
    const button = this.add.container(x, y);
    let isPressed = false;
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x5f9558, 0.97);
    backdrop.fillRoundedRect(-21, -14, 42, 28, 9);
    backdrop.lineStyle(2, 0x3f6e3d, 0.98);
    backdrop.strokeRoundedRect(-21, -14, 42, 28, 9);
    const highlight = this.add.graphics();
    highlight.fillStyle(0xb9ddb2, 0.35);
    highlight.fillRoundedRect(-18, -11, 36, 7, 5);
    const slashA = this.add.rectangle(0, 0, 13, 2.8, 0xf6fff4).setAngle(45);
    const slashB = this.add.rectangle(0, 0, 13, 2.8, 0xf6fff4).setAngle(-45);
    const hitArea = this.add.rectangle(0, 0, 60, 44, 0xffffff, 0.001).setInteractive({ useHandCursor: true });

    hitArea.on("pointerdown", () => {
      isPressed = true;
      button.setScale(0.95);
    });
    hitArea.on("pointerup", () => {
      if (isPressed) {
        onClick();
      }
      isPressed = false;
      button.setScale(1);
    });
    hitArea.on("pointerout", () => {
      isPressed = false;
      button.setScale(1);
    });
    hitArea.on("pointerover", () => {
      if (!isPressed) {
        button.setScale(1.06);
      }
    });
    hitArea.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!isPressed) {
        return;
      }
      const localX = pointer.worldX - x;
      const localY = pointer.worldY - y;
      const inside = localX >= -30 && localX <= 30 && localY >= -22 && localY <= 22;
      button.setScale(inside ? 0.95 : 1);
      if (!inside) {
        isPressed = false;
      }
    });
    hitArea.on("pointerupoutside", () => {
      isPressed = false;
      button.setScale(1);
    });

    button.add([backdrop, highlight, slashA, slashB, hitArea]);
    parent.add(button);
  }

  private addAttendanceIconButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void,
    options: {
      isClaimed: boolean;
    }
  ): void {
    const button = this.add.container(x, y);
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.12);
    body.fillRoundedRect(-width / 2, -height / 2 + 2, width, height, 8);
    body.fillStyle(0xf7efdd, 1);
    body.lineStyle(2, 0xc8b89b, 0.98);
    body.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    body.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    body.fillStyle(0xffffff, 0.22);
    body.fillRoundedRect(-width / 2 + 4, -height / 2 + 3, width - 8, 5, 4);

    const iconColor = options.isClaimed ? 0x4e7a47 : 0x606871;
    const accentColor = options.isClaimed ? 0x8fbf75 : 0x88b871;
    const calendarIcon = this.add.graphics();
    calendarIcon.lineStyle(2, iconColor, 1);
    calendarIcon.strokeRoundedRect(-8.5, -6.6, 17, 14.6, 2.8);
    calendarIcon.fillStyle(accentColor, 0.96);
    calendarIcon.fillRoundedRect(-7.6, -5.9, 15.2, 3.3, 1.4);
    calendarIcon.lineStyle(1.4, iconColor, 0.9);
    calendarIcon.beginPath();
    calendarIcon.moveTo(-8.5, -1.4);
    calendarIcon.lineTo(8.5, -1.4);
    calendarIcon.strokePath();
    calendarIcon.fillStyle(iconColor, 0.92);
    calendarIcon.fillRect(-5.1, 1.8, 2.9, 2.7);
    calendarIcon.fillRect(2.2, 1.8, 2.9, 2.7);
    const hitArea = this.add.rectangle(0, 0, width + 8, height + 8, 0xffffff, 0.001).setInteractive({ useHandCursor: true });

    hitArea.on("pointerup", () => {
      onClick();
    });
    hitArea.on("pointerover", () => {
      button.setScale(1.05);
    });
    hitArea.on("pointerout", () => {
      button.setScale(1);
    });

    button.add([body, calendarIcon, hitArea]);
    parent.add(button);
  }

  private addSettingsIconButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void
  ): void {
    const button = this.add.container(x, y);
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.14);
    body.fillCircle(0, 3, 20);
    body.fillStyle(0xf6f2e8, 1);
    body.lineStyle(2, 0xb29f80, 0.96);
    body.fillCircle(0, 0, 19);
    body.strokeCircle(0, 0, 19);
    body.fillStyle(0xffffff, 0.34);
    body.fillCircle(-3, -5, 10);

    const iconColor = 0x6a737b;
    const gear = this.add.graphics();
    const toothCount = 8;
    const outerRadius = 9.2;
    const innerRadius = 6.7;
    const gearPoints: Phaser.Geom.Point[] = [];
    for (let index = 0; index < toothCount * 2; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * index) / toothCount;
      const pointRadius = index % 2 === 0 ? outerRadius : innerRadius;
      gearPoints.push(new Phaser.Geom.Point(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius));
    }
    gear.fillStyle(iconColor, 1);
    gear.fillPoints(gearPoints, true);
    gear.fillStyle(0xecf0f4, 1);
    gear.fillCircle(0, 0, 3.9);
    gear.fillStyle(0xa1a8ad, 0.8);
    gear.fillCircle(0, 0, 1.5);

    const hitArea = this.add.rectangle(0, 0, width + 8, height + 8, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hitArea.on("pointerup", () => {
      onClick();
    });
    hitArea.on("pointerover", () => {
      button.setScale(1.06);
    });
    hitArea.on("pointerout", () => {
      button.setScale(1);
    });

    button.add([body, gear, hitArea]);
    parent.add(button);
  }

  private addHomeCustomizeIconButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void,
    options: {
      isClaimed: boolean;
    }
  ): void {
    const button = this.add.container(x, y);
    const body = this.add.graphics();
    body.fillStyle(0x000000, 0.12);
    body.fillRoundedRect(-width / 2, -height / 2 + 2, width, height, 8);
    body.fillStyle(0xf7efdd, 1);
    body.lineStyle(2, 0xc8b89b, 0.98);
    body.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    body.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    body.fillStyle(0xffffff, 0.22);
    body.fillRoundedRect(-width / 2 + 4, -height / 2 + 3, width - 8, 5, 4);

    const iconColor = options.isClaimed ? 0x4e7a47 : 0x606871;
    const roofColor = options.isClaimed ? 0x7eb268 : 0x7cb06b;
    const homeIcon = this.add.graphics();
    homeIcon.fillStyle(roofColor, 0.95);
    homeIcon.fillTriangle(0, -9.2, -9.4, -1, 9.4, -1);
    homeIcon.lineStyle(2, iconColor, 1);
    homeIcon.strokeRoundedRect(-6.8, -1, 13.6, 10.8, 2.1);
    homeIcon.strokeRoundedRect(-2.6, 2.8, 5.2, 5, 1.2);

    const hitArea = this.add.rectangle(0, 0, width + 8, height + 8, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hitArea.on("pointerup", () => {
      onClick();
    });
    hitArea.on("pointerover", () => {
      button.setScale(1.05);
    });
    hitArea.on("pointerout", () => {
      button.setScale(1);
    });

    button.add([body, homeIcon, hitArea]);
    parent.add(button);
  }

  private addTriangleArrowButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    direction: "left" | "right",
    onClick: () => void,
    enabled = true
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const mainColor = enabled ? 0x7dc956 : 0x92ab86;
    const strokeColor = enabled ? 0x3e7f2a : 0x6d8364;
    const triangle =
      direction === "left"
        ? this.add.triangle(0, 0, 6, 0, -8, -8, -8, 8, mainColor, enabled ? 0.95 : 0.7)
        : this.add.triangle(0, 0, -6, 0, 8, -8, 8, 8, mainColor, enabled ? 0.95 : 0.7);
    triangle.setStrokeStyle(2.4, strokeColor, enabled ? 1 : 0.78);

    const hitArea = this.add.rectangle(0, 0, 34, 30, 0xffffff, 0.001);
    if (enabled) {
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on("pointerup", () => {
        onClick();
      });
      hitArea.on("pointerover", () => {
        button.setScale(1.06);
      });
      hitArea.on("pointerout", () => {
        button.setScale(1);
      });
    }

    button.add([triangle, hitArea]);
    parent.add(button);
    return button;
  }

  private addButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    options: ButtonOptions = {}
  ): void {
    const enabled = options.enabled ?? true;
    const fillColor = enabled ? (options.fillColor ?? 0x6a8a5e) : 0xa5aaa0;
    const strokeColor = options.strokeColor ?? 0x48624a;
    const textColor = options.textColor ?? "#ffffff";
    const textStrokeColor = options.textStrokeColor;
    const textStrokeThickness = options.textStrokeThickness ?? 0;
    const fontSize = options.fontSize ?? 16;
    const textOffsetY = options.textOffsetY ?? 0;
    const hitPadding = Math.max(0, Math.floor(options.hitPadding ?? 0));
    const triggerOnPointerDown = Boolean(options.triggerOnPointerDown);
    const holdRepeatMs = Math.max(0, Math.floor(options.holdRepeatMs ?? 0));
    const holdRepeatInitialDelayMs = Math.max(
      0,
      Math.floor(options.holdRepeatInitialDelayMs ?? Math.max(260, holdRepeatMs * 2))
    );

    const button = this.add
      .rectangle(x, y, width, height, fillColor, 1)
      .setStrokeStyle(2, strokeColor)
      .setOrigin(0.5);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Pretendard, sans-serif",
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: "700",
      align: "center",
      wordWrap: { width: width - 8 }
    };
    if (textStrokeColor && textStrokeThickness > 0) {
      textStyle.stroke = textStrokeColor;
      textStyle.strokeThickness = textStrokeThickness;
    }

    const text = this.add
      .text(x, y + textOffsetY, label, textStyle)
      .setOrigin(0.5);

    const hitArea = this.add
      .rectangle(x, y, width + hitPadding * 2, height + hitPadding * 2, 0xffffff, 0.001)
      .setOrigin(0.5);

    if (enabled) {
      let isPressed = false;
      let repeatTimer: Phaser.Time.TimerEvent | null = null;
      const clearRepeatTimer = (): void => {
        if (!repeatTimer) {
          return;
        }
        repeatTimer.remove(false);
        repeatTimer = null;
      };

      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on("pointerdown", () => {
        isPressed = true;
        button.setScale(0.97);
        text.setScale(0.97);

        if (triggerOnPointerDown || holdRepeatMs > 0) {
          onClick();
          // onClick can synchronously destroy this button (e.g. modal rerender).
          // Stop here to prevent orphan repeat timers.
          if (!button.active || !hitArea.active || !text.active) {
            isPressed = false;
            clearRepeatTimer();
            return;
          }
        }
        if (holdRepeatMs > 0) {
          clearRepeatTimer();
          repeatTimer = this.time.addEvent({
            delay: holdRepeatInitialDelayMs,
            loop: false,
            callback: () => {
              if (!isPressed) {
                clearRepeatTimer();
                return;
              }
              onClick();
              repeatTimer = this.time.addEvent({
                delay: holdRepeatMs,
                loop: true,
                callback: () => {
                  if (!isPressed) {
                    clearRepeatTimer();
                    return;
                  }
                  onClick();
                }
              });
            }
          });
        }
      });
      hitArea.on("pointerup", () => {
        if (!triggerOnPointerDown && holdRepeatMs <= 0) {
          onClick();
        }
        isPressed = false;
        clearRepeatTimer();
        button.setScale(1);
        text.setScale(1);
      });
      hitArea.on("pointerout", () => {
        isPressed = false;
        clearRepeatTimer();
        button.setScale(1);
        text.setScale(1);
      });
      hitArea.on("pointerupoutside", () => {
        isPressed = false;
        clearRepeatTimer();
        button.setScale(1);
        text.setScale(1);
      });
      hitArea.on("destroy", () => {
        clearRepeatTimer();
      });
    }

    parent.add([button, text, hitArea]);
  }
}
