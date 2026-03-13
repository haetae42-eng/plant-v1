export const SAVE_SCHEMA_VERSION = 1 as const;

export const SAVE_STORAGE_KEY = "haetae.idle-garden.save.v2";

export const GARDEN_COLUMNS = 3;
export const GARDEN_ROWS = 4;
export const GARDEN_SLOT_COUNT = GARDEN_COLUMNS * GARDEN_ROWS;

export const DECOR_DISPLAY_SLOT_LAYOUT = [
  { slotId: "display-top-1", layer: "back" },
  { slotId: "display-top-2", layer: "back" },
  { slotId: "display-mid-1", layer: "mid" },
  { slotId: "display-mid-2", layer: "mid" },
  { slotId: "display-mid-3", layer: "mid" },
  { slotId: "display-bottom-1", layer: "front" },
  { slotId: "display-bottom-2", layer: "front" }
] as const;
export const DECOR_DISPLAY_PAGE_COUNT = 3;

export const MAX_IDLE_SECONDS = 8 * 60 * 60;

export const SAVE_DEBOUNCE_MS = 300;

export const INITIAL_PLAYER_COINS = 120;

export const MAX_PLAYER_COINS = 9999;
export const MAX_PLAYER_GEMS = 999;
export const MAX_TOTAL_SEEDS = 99;
