import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { connectDB } from "@/lib/db/mongoose";
import Household from "@/lib/db/models/Household";
import User from "@/lib/db/models/User";
import { issueToken } from "@/lib/auth/issueToken";

export async function POST(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { inviteCode } = await req.json();
  if (!inviteCode?.trim()) {
    return NextResponse.json({ error: "Código de invitación requerido" }, { status: 400 });
  }

  await connectDB();

  if (authSession.user.householdId) {
    return NextResponse.json({ error: "Ya perteneces a un hogar. Primero debes salir." }, { status: 409 });
  }

  const household = await Household.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
  if (!household) {
    return NextResponse.json({ error: "Código de invitación inválido" }, { status: 404 });
  }

  if (household.members.includes(authSession.user.id)) {
    return NextResponse.json({ error: "Ya eres miembro de este hogar" }, { status: 409 });
  }

  await Household.findByIdAndUpdate(household._id, {
    $addToSet: { members: authSession.user.id },
  });

  const householdId = household._id.toString();
  await User.findByIdAndUpdate(authSession.user.id, { householdId });

  // Issue a new token with the updated householdId (for mobile clients)
  const token = await issueToken({
    userId: authSession.user.id,
    email: authSession.user.email,
    name: authSession.user.name,
    householdId,
  });

  return NextResponse.json({
    householdId,
    name: household.name,
    inviteCode: household.inviteCode,
    token,
  });
}
