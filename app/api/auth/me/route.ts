import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import Household from "@/lib/db/models/Household";

/**
 * GET /api/auth/me
 *
 * Verifies the auth (cookie or Bearer JWT) and returns the current user
 * with their household membership. Used by Flutter on app startup to
 * validate a stored token.
 *
 * Response: { user: { id, email, name, avatar?, preferences, householdId } }
 */
export async function GET(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(authSession.user.id).select("-password").lean();
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Resolve household from DB in case the JWT is stale
  const household = await Household.findOne({ members: authSession.user.id }).lean();
  const householdId = user.householdId ?? household?._id?.toString() ?? null;

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar ?? null,
      preferences: user.preferences,
      householdId,
    },
  });
}
