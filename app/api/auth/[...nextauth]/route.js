import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }
        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user) throw new Error("No user found");
        const isValid = await bcryptjs.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid password");
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          // ── avatar added so it's available right after login ──
          avatar: user.avatar || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: copy fields from the returned user object
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.avatar = user.avatar || null;
      }

      // ── Allow the client to push a fresh avatar into the token ──────
      // Call useSession().update({ avatar: newUrl }) after upload to
      // refresh this immediately, without requiring a re-login.
      if (trigger === 'update' && session?.avatar !== undefined) {
        token.avatar = session.avatar;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.avatar = token.avatar || null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
