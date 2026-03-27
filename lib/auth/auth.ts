import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
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

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar,
          householdId: user.householdId ?? null,
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
