import { BackgroundDef } from "../domain/types";

export const BACKGROUND_DEFS: BackgroundDef[] = [
  {
    id: "bg_sunset",
    nameKo: "제주",
    price: 180,
    skyTopHex: "#ffb184",
    skyBottomHex: "#ffe0bc",
    groundHex: "#bd9c72"
  },
  {
    id: "bg_meadow",
    nameKo: "창문",
    price: 0,
    skyTopHex: "#b8e6ff",
    skyBottomHex: "#f4ffe8",
    groundHex: "#b5d490"
  },
  {
    id: "bg_damyang",
    nameKo: "담양",
    price: 220,
    skyTopHex: "#d8f0dc",
    skyBottomHex: "#edf9ef",
    groundHex: "#8ba97f"
  },
  {
    id: "bg_gangwondo",
    nameKo: "강원도",
    price: 220,
    skyTopHex: "#d7ebf8",
    skyBottomHex: "#ecf5fb",
    groundHex: "#8ca49f"
  },
  {
    id: "bg_japan",
    nameKo: "일본",
    price: 240,
    skyTopHex: "#dcecf3",
    skyBottomHex: "#eef6f9",
    groundHex: "#9aab92"
  },
  {
    id: "bg_china",
    nameKo: "중국",
    price: 240,
    skyTopHex: "#dae9e1",
    skyBottomHex: "#edf5ef",
    groundHex: "#9ba18a"
  },
  {
    id: "bg_france",
    nameKo: "프랑스",
    price: 260,
    skyTopHex: "#d7e5ef",
    skyBottomHex: "#eef4fa",
    groundHex: "#9f9f93"
  },
  {
    id: "bg_italy",
    nameKo: "이탈리아",
    price: 260,
    skyTopHex: "#dae9df",
    skyBottomHex: "#edf6f0",
    groundHex: "#94977f"
  },
  {
    id: "bg_netherlands",
    nameKo: "네덜란드",
    price: 280,
    skyTopHex: "#d5e8f1",
    skyBottomHex: "#ebf4f8",
    groundHex: "#9ea690"
  },
  {
    id: "bg_portugal",
    nameKo: "포르투갈",
    price: 280,
    skyTopHex: "#dce6db",
    skyBottomHex: "#edf4eb",
    groundHex: "#95876f"
  },
  {
    id: "bg_india",
    nameKo: "인도",
    price: 300,
    skyTopHex: "#dfe9df",
    skyBottomHex: "#f2f7ee",
    groundHex: "#9f936e"
  },
  {
    id: "bg_russia",
    nameKo: "러시아",
    price: 300,
    skyTopHex: "#d9e5eb",
    skyBottomHex: "#edf3f8",
    groundHex: "#8f9686"
  },
  {
    id: "bg_spain",
    nameKo: "스페인",
    price: 320,
    skyTopHex: "#e5e1d6",
    skyBottomHex: "#f4f0e5",
    groundHex: "#a08b73"
  },
  {
    id: "bg_switzerland",
    nameKo: "스위스",
    price: 320,
    skyTopHex: "#dde6df",
    skyBottomHex: "#eef4ee",
    groundHex: "#919d8b"
  },
  {
    id: "bg_uk",
    nameKo: "영국",
    price: 340,
    skyTopHex: "#d6e0e8",
    skyBottomHex: "#e9eff5",
    groundHex: "#8c8e8a"
  },
  {
    id: "bg_korean_house",
    nameKo: "한옥",
    price: 360,
    skyTopHex: "#e7dccf",
    skyBottomHex: "#f3e8dc",
    groundHex: "#9a846f"
  },
  {
    id: "bg_window2",
    nameKo: "창문 2",
    price: 200,
    skyTopHex: "#dce8f3",
    skyBottomHex: "#eef6fb",
    groundHex: "#9db196"
  }
];

export const BACKGROUND_BY_ID: Record<string, BackgroundDef> = Object.fromEntries(
  BACKGROUND_DEFS.map((background) => [background.id, background])
);

export const SHOP_BACKGROUND_DEFS: BackgroundDef[] = BACKGROUND_DEFS.filter(
  (background) => background.id !== "bg_meadow" && background.id !== "bg_window2"
);
