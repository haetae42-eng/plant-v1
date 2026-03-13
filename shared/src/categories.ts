export const CATEGORY_DEFINITIONS = [
  { id: "history", label: "역사" },
  { id: "geography", label: "지리" },
  { id: "science", label: "과학" },
  { id: "culture", label: "문화" },
  { id: "sports", label: "스포츠" },
  { id: "technology", label: "기술" }
] as const;

export type CategoryId = (typeof CATEGORY_DEFINITIONS)[number]["id"];

export const CATEGORY_IDS: CategoryId[] = CATEGORY_DEFINITIONS.map((category) => category.id);
export const OVERALL_CATEGORY_ID = "all" as const;

export type RankingCategoryId = CategoryId | typeof OVERALL_CATEGORY_ID;
