import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import WeeklyMenu from "@/lib/db/models/WeeklyMenu";
import Meal from "@/lib/db/models/Meal";
import { generateMenuWithGemini } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "Gemini API key no configurada" },
      { status: 503 }
    );

  const { year, week, mealsPerDay = 3 } = await req.json();

  await connectDB();
  const scopeId = getScopeId(authSession.user);

  const meals = await Meal.find({ scopeId }).lean();
  if (meals.length < 5)
    return NextResponse.json(
      { error: "Necesitas al menos 5 comidas para generar un menú" },
      { status: 400 }
    );

  try {
    const days = await generateMenuWithGemini(
      meals as Parameters<typeof generateMenuWithGemini>[0],
      mealsPerDay,
      apiKey
    );

    const menu = await WeeklyMenu.findOneAndUpdate(
      { scopeId, year, week },
      { scopeId, year, week, days },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(menu);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando menú con IA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
