import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/mongoose";
import Household from "@/lib/db/models/Household";
import User from "@/lib/db/models/User";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** GET — fetch current user's household info + member names */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.user.householdId) return NextResponse.json(null);

  await connectDB();
  const household = await Household.findById(session.user.householdId).lean();
  if (!household) return NextResponse.json(null);

  const members = await User.find({ _id: { $in: household.members } })
    .select("_id name email")
    .lean();

  return NextResponse.json({ ...household, memberDetails: members });
}

/** POST — create a new household */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

  await connectDB();

  if (session.user.householdId) {
    return NextResponse.json({ error: "Ya perteneces a un hogar" }, { status: 409 });
  }

  // Generate a unique invite code
  let inviteCode = generateInviteCode();
  while (await Household.exists({ inviteCode })) {
    inviteCode = generateInviteCode();
  }

  const household = await Household.create({
    name: name.trim(),
    members: [session.user.id],
    inviteCode,
    createdBy: session.user.id,
  });

  await User.findByIdAndUpdate(session.user.id, { householdId: household._id.toString() });

  return NextResponse.json({
    householdId: household._id.toString(),
    name: household.name,
    inviteCode: household.inviteCode,
  }, { status: 201 });
}

/** DELETE — delete the household (only creator) */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.user.householdId) return NextResponse.json({ error: "No perteneces a un hogar" }, { status: 400 });

  await connectDB();
  const household = await Household.findById(session.user.householdId);
  if (!household) return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 });

  if (household.createdBy !== session.user.id) {
    return NextResponse.json({ error: "Solo el creador puede eliminar el hogar" }, { status: 403 });
  }

  // Remove householdId from all members
  await User.updateMany({ householdId: household._id.toString() }, { householdId: null });
  await Household.findByIdAndDelete(household._id);

  return NextResponse.json({ message: "Hogar eliminado" });
}
