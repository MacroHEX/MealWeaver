import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import Household from "@/lib/db/models/Household";
import { issueToken } from "@/lib/auth/issueToken";

/**
 * POST /api/auth/mobile-login
 *
 * Mobile/Flutter login endpoint. Returns a signed JWT (Bearer token)
 * instead of setting a session cookie. The token expires in 30 days
 * and must be sent as `Authorization: Bearer <token>` on subsequent requests.
 *
 * Body: { email: string; password: string }
 * Response: { token: string; user: { id, email, name, householdId } }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: String(email).toLowerCase() }).lean();

    // Use the same error message for both cases to avoid user enumeration
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(String(password), user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const userId = user._id.toString();

    // Look up household membership (same logic as NextAuth authorize)
    const household = await Household.findOne({ members: userId }).lean();
    const householdId = user.householdId ?? household?._id?.toString() ?? null;

    const token = await issueToken({
      userId,
      email: user.email,
      name: user.name,
      householdId,
    });

    return NextResponse.json({
      token,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        householdId,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
