import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import Meal from "@/lib/db/models/Meal";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const meal = await Meal.findOne({ _id: id, scopeId: getScopeId(session) }).lean();
  if (!meal) return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });

  return NextResponse.json(meal);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  await connectDB();

  const update = {
    ...body,
    ...(body.ingredients !== undefined && {
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    }),
  };

  const meal = await Meal.findOneAndUpdate(
    { _id: id, scopeId: getScopeId(session) },
    update,
    { new: true, runValidators: true }
  ).lean();

  if (!meal) return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });
  return NextResponse.json(meal);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const meal = await Meal.findOneAndDelete({ _id: id, scopeId: getScopeId(session) });
  if (!meal) return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });

  return NextResponse.json({ message: "Comida eliminada" });
}
