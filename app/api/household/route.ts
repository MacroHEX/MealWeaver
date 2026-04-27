import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { connectDB } from "@/lib/db/mongoose";
import Household from "@/lib/db/models/Household";
import User from "@/lib/db/models/User";
import { issueToken } from "@/lib/auth/issueToken";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** GET — fetch current user's household info + member names */
export async function GET(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!authSession.user.householdId) return NextResponse.json(null);

  await connectDB();
  const household = await Household.findById(authSession.user.householdId).lean();
  if (!household) return NextResponse.json(null);

  const members = await User.find({ _id: { $in: household.members } })
    .select("_id name email")
    .lean();

  return NextResponse.json({ ...household, memberDetails: members });
}

/** POST — create a new household */
export async function POST(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

  await connectDB();

  if (authSession.user.householdId) {
    return NextResponse.json({ error: "Ya perteneces a un hogar" }, { status: 409 });
  }

  // Generate a unique invite code
  let inviteCode = generateInviteCode();
  while (await Household.exists({ inviteCode })) {
    inviteCode = generateInviteCode();
  }

  const household = await Household.create({
    name: name.trim(),
    members: [authSession.user.id],
    inviteCode,
    createdBy: authSession.user.id,
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
  }, { status: 201 });
}

/** DELETE — delete the household (only creator) */
export async function DELETE(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!authSession.user.householdId) {
    return NextResponse.json({ error: "No perteneces a un hogar" }, { status: 400 });
  }

  await connectDB();
  const household = await Household.findById(authSession.user.householdId);
  if (!household) return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 });

  if (household.createdBy !== authSession.user.id) {
    return NextResponse.json({ error: "Solo el creador puede eliminar el hogar" }, { status: 403 });
  }

  // Remove householdId from all members
  await User.updateMany({ householdId: household._id.toString() }, { householdId: null });
  await Household.findByIdAndDelete(household._id);

  // Issue a new token with householdId cleared (for mobile clients)
  const token = await issueToken({
    userId: authSession.user.id,
    email: authSession.user.email,
    name: authSession.user.name,
    householdId: null,
  });

  return NextResponse.json({ message: "Hogar eliminado", token });
}
