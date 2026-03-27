import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import WeeklyMenu from "@/lib/db/models/WeeklyMenu";
import Meal from "@/lib/db/models/Meal";
import { generateWeeklyMenu } from "@/lib/algorithms/menuGenerator";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const week = Number(searchParams.get("week"));

  await connectDB();
  const scopeId = getScopeId(session);
  const menu = await WeeklyMenu.findOne({ scopeId, year, week }).lean();
  return NextResponse.json(menu ?? null);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { year, week, mealsPerDay = 3 } = await req.json();
  await connectDB();
  const scopeId = getScopeId(session);

  const meals = await Meal.find({ scopeId }).lean();
  if (meals.length < 5) {
    return NextResponse.json(
      { error: "Necesitas al menos 5 comidas para generar un menú" },
      { status: 400 }
    );
  }

  const days = generateWeeklyMenu(meals as Parameters<typeof generateWeeklyMenu>[0], { mealsPerDay });

  const menu = await WeeklyMenu.findOneAndUpdate(
    { scopeId, year, week },
    { scopeId, year, week, days },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(menu);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { year, week, days } = await req.json();
  await connectDB();
  const scopeId = getScopeId(session);

  const menu = await WeeklyMenu.findOneAndUpdate(
    { scopeId, year, week },
    { days },
    { new: true }
  ).lean();

  if (!menu) return NextResponse.json({ error: "Menú no encontrado" }, { status: 404 });
  return NextResponse.json(menu);
}
