import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
        token.displayName = (user as any).displayName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = String(token.id);
        (session.user as any).role = token.role;
        (session.user as any).schoolId = String(token.schoolId);
        (session.user as any).displayName = String(token.displayName);
      }
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isAuthed = !!auth?.user;
      if (path === "/login") {
        if (isAuthed) {
          const target = (auth?.user as any)?.role === "teacher" ? "/dashboard" : "/sus";
          return Response.redirect(new URL(target, request.nextUrl));
        }
        return true;
      }
      if (path.startsWith("/api/auth")) return true;
      if (path === "/einladung") return true;
      if (path === "/anleitung") return true;
      if (path === "/datenschutz") return true;
      return isAuthed;
    },
  },
} satisfies NextAuthConfig;
