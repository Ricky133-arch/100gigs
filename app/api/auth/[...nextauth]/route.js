import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit } from "@/lib/rateLimit";

const CASE_INSENSITIVE = { locale: "en", strength: 2 };
const WRONG_DETAILS = "Wrong email or password.";
const SUSPENDED = "This account has been suspended. Contact 100Gigs support.";

// Re-check role and suspension from the database this often, so changes
// (suspending someone, making someone admin) take effect without waiting
// for their login to expire.
const REFRESH_EVERY_MS = 5 * 60_000; // 5 minutes

// Used when the email doesn't exist, so a wrong email takes as long as a
// wrong password — otherwise response time reveals which emails have accounts.
const DUMMY_HASH = "$2a$12$SvIv9Lj1QtizD6dz12Rlv.jMV6ZbHu37NaHTGlEuuq2kGcJzLpi8.";

function ipFrom(req) {
  const h = req?.headers || {};
  const fwd = typeof h.get === "function" ? h.get("x-forwarded-for") : h["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim() || "unknown";
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) throw new Error("Enter your email and password.");

        // Stop password guessing: per account and per network
        const [perEmail, perIp] = await Promise.all([
          rateLimit(`login:email:${email}`, { max: 10, windowMs: 15 * 60_000 }),
          rateLimit(`login:ip:${ipFrom(req)}`, { max: 30, windowMs: 15 * 60_000 }),
        ]);
        if (!perEmail.ok || !perIp.ok) {
          throw new Error("Too many attempts. Wait 15 minutes, or reset your password.");
        }

        await connectDB();
        // Case-insensitive, so older accounts saved with capitals still work
        const user = await User.findOne({ email })
          .collation(CASE_INSENSITIVE)
          .select("+password");

        const isValid = await bcryptjs.compare(password, user?.password || DUMMY_HASH);
        // Same message either way, so nobody can test which emails are registered
        if (!user || !isValid) throw new Error(WRONG_DETAILS);
        if (user.isSuspended) throw new Error(SUSPENDED);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar || null;
        token.checkedAt = Date.now();
        return token;
      }

      // Client pushes a fresh avatar after upload: useSession().update({ avatar })
      // Only https links accepted — this value comes from the browser.
      if (trigger === "update" && session?.avatar !== undefined) {
        const a = session.avatar;
        if (a === null || a === "") token.avatar = null;
        else if (typeof a === "string" && a.length <= 500 && a.startsWith("https://")) token.avatar = a;
      }

      // Every few minutes, confirm the account still exists, isn't suspended,
      // and still has the same role. A suspended user is logged out on their
      // next page load instead of keeping access for up to 30 days.
      if (token.id && (!token.checkedAt || Date.now() - token.checkedAt > REFRESH_EVERY_MS)) {
        try {
          await connectDB();
          const fresh = await User.findById(token.id).select("name role avatar isSuspended").lean();
          if (!fresh || fresh.isSuspended) {
            token.id = null;
            token.role = null;
          } else {
            token.role = fresh.role;
            token.name = fresh.name;
            token.avatar = fresh.avatar || null;
          }
          token.checkedAt = Date.now();
        } catch (e) {
          // Database hiccup: keep the current login rather than logging everyone out
          console.error("[AUTH] Session refresh failed:", e?.message);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        // Account suspended or deleted: behave exactly like logged out
        session.user = undefined;
        return session;
      }
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.name = token.name ?? session.user.name;
      session.user.avatar = token.avatar || null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };