import { PetDoc } from "@haetae/shared";

export type PetState = {
  level: number;
  xp: number;
  food: number;
  evolved: boolean;
  evolvedStage: number;
};

export function deriveLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export function normalizePetState(petDoc: Partial<PetDoc> | undefined): PetState {
  const xp = Number(petDoc?.xp ?? 0);
  const food = Number(petDoc?.food ?? 0);
  const derivedLevel = deriveLevelFromXp(xp);
  const evolvedStage = Math.max(Number(petDoc?.evolvedStage ?? 0), derivedLevel >= 10 ? 1 : 0);

  return {
    level: Math.max(Number(petDoc?.level ?? derivedLevel), derivedLevel),
    xp,
    food,
    evolved: evolvedStage > 0,
    evolvedStage
  };
}

export function buildUpdatedPetState(current: Partial<PetDoc> | undefined, addFood: number, addXp: number): PetState {
  const currentState = normalizePetState(current);
  const nextXp = Math.max(0, currentState.xp + addXp);
  const nextFood = Math.max(0, currentState.food + addFood);
  const nextLevel = deriveLevelFromXp(nextXp);
  const nextEvolvedStage = Math.max(currentState.evolvedStage, nextLevel >= 10 ? 1 : 0);

  return {
    level: nextLevel,
    xp: nextXp,
    food: nextFood,
    evolved: nextEvolvedStage > 0,
    evolvedStage: nextEvolvedStage
  };
}

export function defaultPetDoc(): PetDoc {
  return {
    level: 1,
    xp: 0,
    food: 30,
    evolvedStage: 0,
    updatedAt: new Date()
  };
}
