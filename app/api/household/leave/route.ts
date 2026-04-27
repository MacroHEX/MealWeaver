import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { connectDB } from "@/lib/db/mongoose";
import Household from "@/lib/db/models/Household";
import User from "@/lib/db/models/User";
import { issueToken } from "@/lib/auth/issueToken";

export async function POST(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!authSession.user.householdId) {
    return NextResponse.json({ error: "No perteneces a un hogar" }, { status: 400 });
  }

  await connectDB();

  const household = await Household.findById(authSession.user.householdId);
  if (!household) {
    await User.findByIdAndUpdate(authSession.user.id, { householdId: null });
  } else {
    const remainingMembers = household.members.filter(
      (m: string) => m !== authSession.user.id
    );

    if (remainingMembers.length === 0) {
      // Last member: delete the household
      await Household.findByIdAndDelete(household._id);
    } else {
      const updates: Record<string, unknown> = {
        $pull: { members: authSession.user.id },
      };
      if (household.createdBy === authSession.user.id) {
        updates.createdBy = remainingMembers[0];
      }
      await Household.findByIdAndUpdate(household._id, updates);
    }

    await User.findByIdAndUpdate(authSession.user.id, { householdId: null });
  }

  // Issue a new token with householdId cleared (for mobile clients)
  const token = await issueToken({
    userId: authSession.user.id,
    email: authSession.user.email,
    name: authSession.user.name,
    householdId: null,
  });

  return NextResponse.json({ message: "Saliste del hogar", token });
}
