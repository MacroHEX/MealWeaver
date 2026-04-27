import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import WeeklyMenu from "@/lib/db/models/WeeklyMenu";
import Meal from "@/lib/db/models/Meal";
import { generateWeeklyMenu } from "@/lib/algorithms/menuGenerator";
import { getWeeksInMonth } from "@/lib/utils";

/** GET /api/menus/monthly?year=2026&month=3
 *  Returns all weekly menus that overlap with the given month */
export async function GET(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  await connectDB();
  const scopeId = getScopeId(authSession.user);
  const weeks = getWeeksInMonth(year, month);

  const menus = await WeeklyMenu.find({
    scopeId,
    $or: weeks.map((week) => {
      const weekYear = week === 1 && month === 12 ? year + 1 : year;
      return { year: weekYear, week };
    }),
  })
    .sort({ year: 1, week: 1 })
    .lean();

  return NextResponse.json({ weeks, menus });
}

/** POST /api/menus/monthly — generate all weeks of a month at once */
export async function POST(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { year, month, mealsPerDay = 3 } = await req.json();
  await connectDB();
  const scopeId = getScopeId(authSession.user);

  const meals = await Meal.find({ scopeId }).lean();
  if (meals.length < 5) {
    return NextResponse.json(
      { error: "Necesitas al menos 5 comidas para generar un menú" },
      { status: 400 }
    );
  }

  const weeks = getWeeksInMonth(year, month);
  const results = [];

  for (const week of weeks) {
    const weekYear = week === 1 && month === 12 ? year + 1 : year;
    const days = generateWeeklyMenu(
      meals as Parameters<typeof generateWeeklyMenu>[0],
      { mealsPerDay }
    );
    const menu = await WeeklyMenu.findOneAndUpdate(
      { scopeId, year: weekYear, week },
      { scopeId, year: weekYear, week, days },
      { upsert: true, new: true }
    ).lean();
    results.push(menu);
  }

  return NextResponse.json(results);
}
