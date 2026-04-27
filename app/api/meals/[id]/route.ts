import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { getScopeId } from "@/lib/auth/getScopeId";
import { connectDB } from "@/lib/db/mongoose";
import Meal from "@/lib/db/models/Meal";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const meal = await Meal.findOne({ _id: id, scopeId: getScopeId(authSession.user) }).lean();
  if (!meal) return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });

  return NextResponse.json(meal);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
    { _id: id, scopeId: getScopeId(authSession.user) },
    update,
    { new: true, runValidators: true }
  ).lean();

  if (!meal) return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });
  return NextResponse.json(meal);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const meal = await Meal.findOneAndDelete({ _id: id, scopeId: getScopeId(authSession.user) });
  if (!meal) return NextResponse.json({ error: "Comida no encontrada" }, { status: 404 });

  return NextResponse.json({ message: "Comida eliminada" });
}
