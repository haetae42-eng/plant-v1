import { CategoryId, RankingCategoryId } from "./categories";

export type Difficulty = 1 | 2 | 3;

export const QUIZ_QUESTION_COUNT = 10;
export const QUIZ_TIME_LIMIT_MS = 15_000;
export const DAILY_RUN_LIMIT = 20;

export const BASE_REWARD_FOOD = 10;
export const BASE_REWARD_PET_XP = 25;

export type QuizQuestionMasked = {
  questionId: string;
  categoryId: CategoryId;
  prompt: string;
  choices: string[];
  difficulty: Difficulty;
};

export type QuizQuestionFull = QuizQuestionMasked & {
  answerIndex: number;
};

export type QuizAnswerPayload = {
  questionId: string;
  choice: number;
  timeMs: number;
};

export type StartRunReq = { userId: string; categoryId: CategoryId };
export type StartRunRes = {
  runId: string;
  kstDate: string;
  questions: QuizQuestionMasked[];
};

export type SubmitRunReq = {
  userId: string;
  runId: string;
  answers: QuizAnswerPayload[];
};

export type RewardPayload = {
  food: number;
  petXp: number;
};

export type SubmitRunRes = {
  totalScore: number;
  correctCount: number;
  rankUpdated: boolean;
  rewards: RewardPayload;
};

export type GetDailyRankReq = {
  categoryId?: RankingCategoryId;
  kstDate?: string;
  limit?: number;
};

export type RankEntry = {
  rank: number;
  nickname: string;
  score: number;
};

export type GetDailyRankRes = {
  entries: RankEntry[];
  kstDate: string;
  categoryId: RankingCategoryId;
};

export type FeedPetReq = { userId: string; amount: number };

export type FeedPetRes = {
  level: number;
  xp: number;
  evolved: boolean;
  food: number;
};

export type SyncUserReq = {
  userId: string;
  nickname: string;
  deviceHash: string;
};

export type SyncUserRes = {
  userId: string;
  nickname: string;
  pet: {
    level: number;
    xp: number;
    food: number;
    evolved: boolean;
  };
};

export type ClaimAdBonusReq = {
  userId: string;
  runId: string;
};

export type ClaimAdBonusRes = {
  rewards: RewardPayload;
  pet: {
    level: number;
    xp: number;
    food: number;
    evolved: boolean;
  };
};
