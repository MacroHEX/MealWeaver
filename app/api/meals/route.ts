import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import Meal from "@/lib/db/models/Meal";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const query: Record<string, unknown> = { scopeId: getScopeId(session) };
  if (type) query.type = type;
  if (search) query.name = { $regex: search, $options: "i" };

  const meals = await Meal.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json(meals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    await connectDB();

    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients
      : [];

    const meal = await Meal.create({
      ...body,
      ingredients,
      userId: session.user.id,
      scopeId: getScopeId(session),
    });
    return NextResponse.json(meal, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creando la comida";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
