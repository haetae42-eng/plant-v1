import { CategoryId, RankingCategoryId } from "./categories";
import { QuizQuestionFull, RewardPayload } from "./contracts";

type TimestampValue = unknown;

export type UserDoc = {
  nickname: string;
  deviceHash: string;
  createdAt: TimestampValue;
  lastLoginAt: TimestampValue;
};

export type PetDoc = {
  level: number;
  xp: number;
  food: number;
  evolvedStage: number;
  updatedAt: TimestampValue;
};

export type QuestionDoc = {
  categoryId: CategoryId;
  difficulty: 1 | 2 | 3;
  prompt: string;
  choices: string[];
  answerIndex: number;
};

export type RunDoc = {
  userId: string;
  categoryId: CategoryId;
  kstDate: string;
  questions: QuizQuestionFull[];
  startedAt: TimestampValue;
  submittedAt?: TimestampValue;
  answers?: {
    questionId: string;
    choice: number;
    timeMs: number;
  }[];
  score?: number;
  correctCount?: number;
  baseRewards?: RewardPayload;
  adBonusClaimed?: boolean;
};

export type DailyLeaderboardEntryDoc = {
  score: number;
  nickname: string;
  updatedAt: TimestampValue;
};

export type DailyRewardClaimDoc = {
  food: number;
  petXp: number;
  sourceDate: string;
  categories: RankingCategoryId[];
  claimedAt: TimestampValue;
};

export type DailyUserStatsDoc = {
  runCount: number;
  updatedAt: TimestampValue;
};
