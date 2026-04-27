import { SignJWT } from "jose";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  householdId: string | null;
}

/** Signs a 30-day JWT using AUTH_SECRET — used for mobile/Flutter clients */
export async function issueToken(payload: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}
