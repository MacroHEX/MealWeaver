import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import WeeklyMenu from "@/lib/db/models/WeeklyMenu";
import Meal from "@/lib/db/models/Meal";
import type { IMeal } from "@/lib/db/models/Meal";

export interface ShoppingItem {
  name: string;
  quantities: string[];
  mealNames: string[];
}

/**
 * GET /api/shopping-list?year=2026&week=13
 * Aggregates all ingredients from the meals in a weekly menu.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const week = Number(searchParams.get("week"));

  await connectDB();
  const scopeId = getScopeId(session);

  const menu = await WeeklyMenu.findOne({ scopeId, year, week }).lean();
  if (!menu) return NextResponse.json([]);

  // Collect all meal IDs referenced in the menu
  const mealIds = new Set<string>();
  for (const day of menu.days) {
    if (day.breakfast) mealIds.add(day.breakfast);
    if (day.lunch) mealIds.add(day.lunch);
    if (day.dinner) mealIds.add(day.dinner);
  }

  const meals = await Meal.find({ _id: { $in: Array.from(mealIds) } }).lean() as IMeal[];
  const mealMap = Object.fromEntries(meals.map((m) => [m._id.toString(), m]));

  // Aggregate ingredients by name (case-insensitive)
  const itemMap = new Map<string, ShoppingItem>();

  for (const mealId of mealIds) {
    const meal = mealMap[mealId];
    if (!meal) continue;

    for (const ing of meal.ingredients) {
      const key = ing.name.trim().toLowerCase();
      if (!key) continue;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          name: ing.name.trim(),
          quantities: [],
          mealNames: [],
        });
      }
      const item = itemMap.get(key)!;
      if (ing.quantity?.trim()) item.quantities.push(ing.quantity.trim());
      if (!item.mealNames.includes(meal.name)) item.mealNames.push(meal.name);
    }
  }

  const list = Array.from(itemMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );

  return NextResponse.json(list);
}
