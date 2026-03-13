import { PotDef } from "../domain/types";

export const POT_DEFS: PotDef[] = [
  { id: "pot_clay", nameKo: "토분", price: 0, colorHex: "#b97849", rimHex: "#8f5a36" },
  { id: "pot_white", nameKo: "화이트", price: 80, colorHex: "#f2f2f0", rimHex: "#c8c8c6" },
  { id: "pot_yellow", nameKo: "옐로우", price: 110, colorHex: "#edca67", rimHex: "#c19d3d" },
  { id: "pot_green", nameKo: "그린", price: 140, colorHex: "#7cab55", rimHex: "#5f883d" },
  { id: "pot_silver", nameKo: "실버", price: 170, colorHex: "#cfd2d6", rimHex: "#9da3ac" },
  { id: "pot_blue", nameKo: "블루", price: 210, colorHex: "#6c8fb6", rimHex: "#4f6f94" },
  { id: "pot_pink", nameKo: "핑크", price: 240, colorHex: "#d7a2af", rimHex: "#b07a88" },
  { id: "pot_violet", nameKo: "바이올렛", price: 270, colorHex: "#9c88b5", rimHex: "#7a6795" },
  { id: "pot_cylinder", nameKo: "모던 세라믹", price: 300, colorHex: "#c6b59f", rimHex: "#9f8c73" },
  { id: "pot_moon_jar", nameKo: "백자", price: 330, colorHex: "#d8dce2", rimHex: "#aeb5bf" },
  { id: "pot_moon_jar_cream", nameKo: "달항아리", price: 570, colorHex: "#ece4d6", rimHex: "#cbbca4" },
  { id: "pot_moon_jar_crock", nameKo: "항아리", price: 600, colorHex: "#c4b49a", rimHex: "#98856e" },
  { id: "pot_organic_cream", nameKo: "오가닉 크림", price: 360, colorHex: "#e5cfb0", rimHex: "#b38f6b" },
  { id: "pot_organic_mocha", nameKo: "오가닉 모카", price: 390, colorHex: "#ac8e73", rimHex: "#7f624a" },
  { id: "pot_organic_olive", nameKo: "오가닉 올리브", price: 420, colorHex: "#93a26a", rimHex: "#6f7f4f" },
  { id: "pot_organic_sand", nameKo: "오가닉 샌드", price: 450, colorHex: "#d7bf95", rimHex: "#aa8a5f" },
  { id: "pot_modern_mocha", nameKo: "모던 모카", price: 480, colorHex: "#8b7058", rimHex: "#664f3f" },
  { id: "pot_modern_sand", nameKo: "모던 샌드", price: 510, colorHex: "#cfb387", rimHex: "#a4845c" },
  { id: "pot_modern_olive", nameKo: "모던 올리브", price: 540, colorHex: "#7f8f63", rimHex: "#5f6d49" },
  { id: "pot_antique_greece", nameKo: "앤틱 그리스", price: 630, colorHex: "#b89f81", rimHex: "#7e664d" }
];

export const POT_BY_ID: Record<string, PotDef> = Object.fromEntries(POT_DEFS.map((pot) => [pot.id, pot]));
