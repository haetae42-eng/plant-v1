import { CATEGORY_IDS, OVERALL_CATEGORY_ID, RankingCategoryId } from "@haetae/shared";
import { HttpsError } from "firebase-functions/v2/https";

export function requireObject(value: unknown, message = "Invalid request body"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", message);
  }

  return value as Record<string, unknown>;
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${fieldName} is required`);
  }
  return value.trim();
}

export function requireUserId(authUid: string | undefined, userId: unknown): string {
  const requestedUserId = requireString(userId, "userId");

  if (authUid && requestedUserId !== authUid) {
    throw new HttpsError("permission-denied", "userId does not match auth uid");
  }

  return requestedUserId;
}

export function requireCategoryId(value: unknown): (typeof CATEGORY_IDS)[number] {
  const categoryId = requireString(value, "categoryId");
  if (!CATEGORY_IDS.includes(categoryId as (typeof CATEGORY_IDS)[number])) {
    throw new HttpsError("invalid-argument", "Unknown categoryId");
  }

  return categoryId as (typeof CATEGORY_IDS)[number];
}

export function parseRankingCategoryId(value: unknown): RankingCategoryId {
  if (value === undefined || value === null || value === "") {
    return OVERALL_CATEGORY_ID;
  }

  const categoryId = requireString(value, "categoryId");
  if (categoryId === OVERALL_CATEGORY_ID) {
    return OVERALL_CATEGORY_ID;
  }

  if (!CATEGORY_IDS.includes(categoryId as (typeof CATEGORY_IDS)[number])) {
    throw new HttpsError("invalid-argument", "Unknown ranking categoryId");
  }

  return categoryId as RankingCategoryId;
}

export function requireNickname(value: unknown): string {
  const nickname = requireString(value, "nickname");
  if (nickname.length < 2 || nickname.length > 12) {
    throw new HttpsError("invalid-argument", "nickname must be 2-12 chars");
  }

  const nicknameRegex = /^[0-9A-Za-z가-힣_]+$/;
  if (!nicknameRegex.test(nickname)) {
    throw new HttpsError("invalid-argument", "nickname contains unsupported characters");
  }

  return nickname;
}
