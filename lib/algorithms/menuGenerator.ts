import type { IMeal } from "@/lib/db/models/Meal";
import type { IDayMenu } from "@/lib/db/models/WeeklyMenu";
import type { MenuGeneratorOptions, DayOfWeek, MealType } from "@/types";
import { DAYS_OF_WEEK } from "@/types";

/**
 * Protein groups used for anti-consecutive scheduling.
 * carne_roja and chancho share the same group so they never appear back-to-back.
 */
const PROTEIN_GROUP: Record<MealType, string> = {
  carne_roja: "carne",
  chancho: "carne",
  pollo: "pollo",
  pescado: "pescado",
  pasta: "pasta",
  arroz: "arroz",
  sopa: "sopa",
  otro: "otro",
};

/**
 * How many times a type can appear in a single week (lunch slot).
 * Types not listed default to 3.
 */
const WEEKLY_MAX: Partial<Record<MealType, number>> = {
  carne_roja: 3,
  chancho: 2,
  pollo: 3,
  pescado: 2,
  pasta: 2,
  arroz: 2,
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

/**
 * Arrange 7 meals so no two consecutive days share the same protein group.
 *
 * Strategy: greedy "pick the most-available group that differs from yesterday".
 * This guarantees a non-consecutive solution whenever one exists (which it always
 * does for our distribution since no single group exceeds 4 out of 7 days).
 */
function arrangeMealsNoConsecutive(meals: IMeal[]): IMeal[] {
  if (meals.length <= 1) return meals;

  // Bucket meals by protein group, shuffling within each bucket for variety
  const buckets: Record<string, IMeal[]> = {};
  for (const meal of shuffle(meals)) {
    const g = PROTEIN_GROUP[meal.type];
    if (!buckets[g]) buckets[g] = [];
    buckets[g].push(meal);
  }

  const result: IMeal[] = [];
  let lastGroup: string | null = null;

  while (result.length < meals.length) {
    // Among all non-empty buckets, prefer the one furthest from the last group
    // and with the most remaining meals (to keep options open for later days)
    const candidates = Object.entries(buckets)
      .filter(([g, arr]) => g !== lastGroup && arr.length > 0)
      .sort((a, b) => b[1].length - a[1].length);

    // Fallback: if every remaining bucket is the same group, allow repeat
    const [group, arr] =
      candidates.length > 0
        ? candidates[0]
        : (Object.entries(buckets).find(([, a]) => a.length > 0) ?? [null, null]);

    if (!group || !arr) break;
    result.push(arr.shift()!);
    lastGroup = group;
  }

  return result;
}

/**
 * Build a pool of exactly 7 lunch meals for the week.
 *
 * Phase 1 — guaranteed minimums by protein type:
 *   2 carne_roja, 1 chancho (if available), 2 pollo, 1 pescado
 *
 * Phase 2 — fill remaining slots with any type,
 *   respecting WEEKLY_MAX per type.
 *
 * Phase 3 — last resort: re-use anything still unused if still short.
 */
function buildWeeklyPool(meals: IMeal[]): IMeal[] {
  const byType: Record<MealType, IMeal[]> = {
    carne_roja: [],
    chancho: [],
    pollo: [],
    pescado: [],
    pasta: [],
    arroz: [],
    sopa: [],
    otro: [],
  };

  for (const meal of meals) byType[meal.type].push(meal);

  const pool: IMeal[] = [];
  const usedIds = new Set<string>();

  function pick(type: MealType, count: number) {
    const available = shuffle(byType[type]).filter((m) => !usedIds.has(m._id.toString()));
    for (let i = 0; i < Math.min(count, available.length); i++) {
      pool.push(available[i]);
      usedIds.add(available[i]._id.toString());
    }
  }

  // Phase 1: guaranteed protein minimums
  pick("carne_roja", 2);
  pick("chancho", 1);
  pick("pollo", 2);
  pick("pescado", 1);

  // Phase 2: fill remaining slots respecting weekly maxima
  const typeCount: Record<string, number> = {};
  for (const m of pool) typeCount[m.type] = (typeCount[m.type] ?? 0) + 1;

  for (const meal of shuffle(meals)) {
    if (pool.length >= 7) break;
    if (usedIds.has(meal._id.toString())) continue;
    const max = WEEKLY_MAX[meal.type] ?? 3;
    if ((typeCount[meal.type] ?? 0) < max) {
      pool.push(meal);
      usedIds.add(meal._id.toString());
      typeCount[meal.type] = (typeCount[meal.type] ?? 0) + 1;
    }
  }

  // Phase 3: last resort — any unused meal
  for (const meal of shuffle(meals)) {
    if (pool.length >= 7) break;
    if (!usedIds.has(meal._id.toString())) {
      pool.push(meal);
      usedIds.add(meal._id.toString());
    }
  }

  return pool.slice(0, 7);
}

function pickBreakfast(meals: IMeal[], usedIds: Set<string>): string | undefined {
  const pool = shuffle(meals.filter((m) => m.isBreakfast && !usedIds.has(m._id.toString())));
  if (pool.length > 0) {
    usedIds.add(pool[0]._id.toString());
    return pool[0]._id.toString();
  }
  return undefined;
}

export function generateWeeklyMenu(
  meals: IMeal[],
  options: MenuGeneratorOptions
): IDayMenu[] {
  const { mealsPerDay } = options;
  const lunchMeals = meals.filter((m) => !m.isBreakfast);

  // Build pool → arrange with no consecutive same protein group
  const pool = buildWeeklyPool(lunchMeals);
  const arranged = arrangeMealsNoConsecutive(pool);

  const usedBreakfastIds = new Set<string>(arranged.map((m) => m._id.toString()));

  return DAYS_OF_WEEK.map((day: DayOfWeek, index: number) => {
    const dayMenu: IDayMenu = { dayOfWeek: day };
    if (mealsPerDay === 3) {
      dayMenu.breakfast = pickBreakfast(meals, usedBreakfastIds);
    }
    dayMenu.lunch = arranged[index]?._id.toString();
    dayMenu.dinner = dayMenu.lunch; // cook once, eat twice
    return dayMenu;
  });
}