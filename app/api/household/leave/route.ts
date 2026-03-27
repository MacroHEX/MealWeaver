import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB } from "@/lib/db/mongoose";
import Household from "@/lib/db/models/Household";
import User from "@/lib/db/models/User";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!session.user.householdId) {
    return NextResponse.json({ error: "No perteneces a un hogar" }, { status: 400 });
  }

  await connectDB();

  const household = await Household.findById(session.user.householdId);
  if (!household) {
    await User.findByIdAndUpdate(session.user.id, { householdId: null });
    return NextResponse.json({ message: "Saliste del hogar" });
  }

  // If the creator leaves and there are others, transfer ownership
  const remainingMembers = household.members.filter((m: string) => m !== session.user.id);

  if (remainingMembers.length === 0) {
    // Last member: delete the household
    await Household.findByIdAndDelete(household._id);
  } else {
    const updates: Record<string, unknown> = {
      $pull: { members: session.user.id },
    };
    if (household.createdBy === session.user.id) {
      updates.createdBy = remainingMembers[0];
    }
    await Household.findByIdAndUpdate(household._id, updates);
  }

  await User.findByIdAndUpdate(session.user.id, { householdId: null });

  return NextResponse.json({ message: "Saliste del hogar" });
}
