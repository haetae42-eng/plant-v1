import { QUIZ_TIME_LIMIT_MS, QuizAnswerPayload, QuizQuestionFull } from "@haetae/shared";

export type ScoreResult = {
  totalScore: number;
  correctCount: number;
};

export function calculateScore(questions: QuizQuestionFull[], answers: QuizAnswerPayload[]): ScoreResult {
  const answerMap = new Map<string, QuizAnswerPayload>();

  for (const answer of answers) {
    if (!answerMap.has(answer.questionId)) {
      answerMap.set(answer.questionId, answer);
    }
  }

  let totalScore = 0;
  let correctCount = 0;

  for (const question of questions) {
    const answer = answerMap.get(question.questionId);
    if (!answer) {
      continue;
    }

    if (!Number.isInteger(answer.choice) || answer.choice < 0 || answer.choice > 3) {
      continue;
    }

    if (!Number.isFinite(answer.timeMs) || answer.timeMs < 0 || answer.timeMs > QUIZ_TIME_LIMIT_MS + 250) {
      continue;
    }

    if (answer.choice === question.answerIndex) {
      correctCount += 1;
      const timeBonus = Math.max(0, Math.floor((QUIZ_TIME_LIMIT_MS - answer.timeMs) / 100));
      totalScore += 100 + timeBonus;
    }
  }

  return { totalScore, correctCount };
}
