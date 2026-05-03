import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import Household from "@/lib/db/models/Household";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  // Required in production self-hosted deploys (next start, Docker, etc).
  // Without it, NextAuth v5 rejects any incoming host as untrusted unless
  // it auto-detects the platform (Vercel sets VERCEL_URL automatically).
  // Override per-env with AUTH_TRUST_HOST=false if you want stricter checking.
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        // Look up household membership in case householdId isn't on the user doc
        const userId = user._id.toString();
        const household = await Household.findOne({ members: userId }).lean();
        const householdId = user.householdId ?? household?._id?.toString() ?? null;

        return {
          id: userId,
          email: user.email,
          name: user.name,
          image: user.avatar,
          householdId,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign-in, persist extra fields from the authorized user
      if (user) {
        token.id = user.id;
        token.householdId = (user as { householdId?: string | null }).householdId ?? null;
      }
      // On manual session update (join/leave household), sync householdId
      if (trigger === "update" && session) {
        token.householdId = session.householdId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      session.user.householdId = (token.householdId as string | null) ?? null;
      return session;
    },
  },
});
