import { CategoryId } from "./categories";
import { QuizQuestionFull } from "./contracts";
import { BUILTIN_FACTS } from "./builtinFacts";

const TARGET_BUILTIN_QUESTION_COUNT = 300;
const VARIANTS_PER_FACT = 10;

function rotateArray<T>(source: T[], offset: number): T[] {
  const safeOffset = ((offset % source.length) + source.length) % source.length;
  return source.slice(safeOffset).concat(source.slice(0, safeOffset));
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const cloned = [...items];
  let random = seed;
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    random = (1664525 * random + 1013904223) >>> 0;
    const swapIndex = random % (index + 1);
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function buildQuestionBank(): QuizQuestionFull[] {
  const questions: QuizQuestionFull[] = [];

  for (const fact of BUILTIN_FACTS) {
    for (let variant = 0; variant < VARIANTS_PER_FACT; variant += 1) {
      const rotatedWrongPool = rotateArray(fact.wrongPool, variant);
      const distractors = rotatedWrongPool.slice(0, 3);
      const shuffledChoices = seededShuffle(
        [fact.answer, ...distractors],
        hashSeed(`${fact.id}-${variant}`)
      );
      const answerIndex = shuffledChoices.findIndex((choice) => choice === fact.answer);

      questions.push({
        questionId: `${fact.id}-v${variant + 1}`,
        categoryId: fact.categoryId,
        prompt: fact.prompt,
        choices: shuffledChoices,
        difficulty: fact.difficulty,
        answerIndex
      });
    }
  }

  return questions.slice(0, TARGET_BUILTIN_QUESTION_COUNT);
}

export const BUILTIN_QUESTIONS: QuizQuestionFull[] = buildQuestionBank();

export function pickBuiltinQuestionsByCategory(categoryId: CategoryId, count: number): QuizQuestionFull[] {
  const pool = BUILTIN_QUESTIONS.filter((question) => question.categoryId === categoryId);
  const shuffled = seededShuffle(pool, hashSeed(`${categoryId}-${Date.now()}`));
  return shuffled.slice(0, count);
}

export function maskQuestion(question: QuizQuestionFull) {
  return {
    questionId: question.questionId,
    categoryId: question.categoryId,
    prompt: question.prompt,
    choices: question.choices,
    difficulty: question.difficulty
  };
}
