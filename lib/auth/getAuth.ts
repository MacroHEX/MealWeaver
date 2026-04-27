import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  householdId: string | null;
}

/**
 * Unified auth helper: accepts both NextAuth session cookies (web app)
 * and Bearer JWT tokens (Flutter/mobile).
 *
 * Usage in route handlers:
 *   const authSession = await getAuth(req);
 *   if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
 */
export async function getAuth(req?: NextRequest): Promise<{ user: AuthUser } | null> {
  // 1. Try NextAuth session first (web app uses httpOnly cookies)
  const session = await auth();
  if (session?.user?.id) {
    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name ?? "",
        householdId: session.user.householdId ?? null,
      },
    };
  }

  // 2. Try Bearer JWT (Flutter / mobile clients)
  if (!req) return null;
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "string") return null;
    return {
      user: {
        id: payload.userId,
        email: typeof payload.email === "string" ? payload.email : "",
        name: typeof payload.name === "string" ? payload.name : "",
        householdId:
          typeof payload.householdId === "string" ? payload.householdId : null,
      },
    };
  } catch {
    return null;
  }
}
