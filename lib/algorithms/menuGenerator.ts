import type { IMeal } from "@/lib/db/models/Meal";
import type { IDayMenu } from "@/lib/db/models/WeeklyMenu";
import type { MenuGeneratorOptions, DayOfWeek, MealType } from "@/types";
import { DAYS_OF_WEEK } from "@/types";

interface ProteinTarget {
  type: MealType;
  min: number;
  max: number;
}

const WEEKLY_PROTEIN_TARGETS: ProteinTarget[] = [
  { type: "carne_roja", min: 2, max: 3 },
  { type: "pollo", min: 2, max: 2 },
  { type: "pescado", min: 1, max: 2 },
];

const SIDE_MAX_REPEAT: Record<string, number> = {
  arroz: 2,
  pasta: 2,
  sopa: 2,
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getMealById(meals: IMeal[], id: string): IMeal | undefined {
  return meals.find((m) => m._id.toString() === id);
}

function countType(selectedIds: string[], meals: IMeal[], type: MealType): number {
  return selectedIds.filter((id) => getMealById(meals, id)?.type === type).length;
}

/**
 * Builds a weekly lunch/dinner plan that respects protein rotation.
 * Returns an array of 7 lunch meal IDs (one per day).
 */
function assignProteinRotation(meals: IMeal[]): string[] {
  const mealsByType: Record<MealType, IMeal[]> = {
    carne_roja: [],
    pollo: [],
    pescado: [],
    pasta: [],
    arroz: [],
    sopa: [],
    otro: [],
  };

  for (const meal of meals) {
    mealsByType[meal.type].push(meal);
  }

  // Build a target list for the week: 2-3 carne, 2 pollo, 1-2 pescado, fill rest
  const plan: IMeal[] = [];
  const usedIds = new Set<string>();

  function pickFrom(type: MealType, count: number) {
    const pool = shuffle(mealsByType[type]).filter((m) => !usedIds.has(m._id.toString()));
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      plan.push(pool[i]);
      usedIds.add(pool[i]._id.toString());
    }
  }

  pickFrom("carne_roja", 2);
  pickFrom("pollo", 2);
  pickFrom("pescado", 1);

  // Fill remaining 2 days with any available type, respecting side repeat limits
  const remaining = 7 - plan.length;
  const sideCount: Record<string, number> = {};
  const allPool = shuffle(meals).filter((m) => !usedIds.has(m._id.toString()));

  for (const meal of allPool) {
    if (plan.length >= 7) break;
    const sideType = meal.type;
    const max = SIDE_MAX_REPEAT[sideType] ?? 3;
    if ((sideCount[sideType] ?? 0) < max) {
      plan.push(meal);
      usedIds.add(meal._id.toString());
      sideCount[sideType] = (sideCount[sideType] ?? 0) + 1;
    }
  }

  // If still short, re-use allowed types
  if (plan.length < 7) {
    const fallback = shuffle(meals).filter((m) => !usedIds.has(m._id.toString()));
    for (const meal of fallback) {
      if (plan.length >= 7) break;
      plan.push(meal);
    }
  }

  return shuffle(plan)
    .slice(0, 7)
    .map((m) => m._id.toString());
}

function pickBreakfast(meals: IMeal[], usedIds: Set<string>): string | undefined {
  // Only use meals marked as breakfast
  const pool = shuffle(
    meals.filter((m) => m.isBreakfast && !usedIds.has(m._id.toString()))
  );
  if (pool.length > 0) {
    usedIds.add(pool[0]._id.toString());
    return pool[0]._id.toString();
  }
  // No breakfast meals defined — leave slot empty
  return undefined;
}

export function generateWeeklyMenu(
  meals: IMeal[],
  options: MenuGeneratorOptions
): IDayMenu[] {
  const { mealsPerDay } = options;
  const lunchMeals = meals.filter((m) => !m.isBreakfast);
  const lunches = assignProteinRotation(lunchMeals);
  const usedBreakfastIds = new Set<string>(lunches);

  const days: IDayMenu[] = DAYS_OF_WEEK.map((day: DayOfWeek, index: number) => {
    const dayMenu: IDayMenu = { dayOfWeek: day };

    if (mealsPerDay === 3) {
      dayMenu.breakfast = pickBreakfast(meals, usedBreakfastIds);
    }

    dayMenu.lunch = lunches[index];

    // Dinner defaults to the same as lunch (cook once, eat twice)
    dayMenu.dinner = dayMenu.lunch;

    return dayMenu;
  });

  return days;
}

export function validateMenuBalance(days: IDayMenu[], meals: IMeal[]): boolean {
  const lunchIds = days.map((d) => d.lunch).filter(Boolean) as string[];
  const carneCount = countType(lunchIds, meals, "carne_roja");
  const polloCount = countType(lunchIds, meals, "pollo");
  const pescadoCount = countType(lunchIds, meals, "pescado");

  for (const target of WEEKLY_PROTEIN_TARGETS) {
    const count =
      target.type === "carne_roja"
        ? carneCount
        : target.type === "pollo"
          ? polloCount
          : pescadoCount;
    if (count < target.min) return false;
  }

  return true;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
