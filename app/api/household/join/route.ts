import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/mongoose";
import Household from "@/lib/db/models/Household";
import User from "@/lib/db/models/User";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { inviteCode } = await req.json();
  if (!inviteCode?.trim()) {
    return NextResponse.json({ error: "Código de invitación requerido" }, { status: 400 });
  }

  await connectDB();

  if (session.user.householdId) {
    return NextResponse.json({ error: "Ya perteneces a un hogar. Primero debes salir." }, { status: 409 });
  }

  const household = await Household.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
  if (!household) {
    return NextResponse.json({ error: "Código de invitación inválido" }, { status: 404 });
  }

  if (household.members.includes(session.user.id)) {
    return NextResponse.json({ error: "Ya eres miembro de este hogar" }, { status: 409 });
  }

  await Household.findByIdAndUpdate(household._id, {
    $addToSet: { members: session.user.id },
  });
  await User.findByIdAndUpdate(session.user.id, { householdId: household._id.toString() });

  return NextResponse.json({
    householdId: household._id.toString(),
    name: household.name,
    inviteCode: household.inviteCode,
  });
}
