import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
    // Credentials provider for dev/testing (username + password)
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
          include: { userRoles: { include: { role: true } } },
        });

        if (!user || !user.password || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!passwordMatch) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.userRoles.map((ur) => ur.role.name),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Credentials sign-in: user object carries id + roles
      if (user) {
        token.userId = user.id;
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }
      // Azure AD sign-in: look up by externalId (Azure OID = profile.sub)
      if (account?.provider === "microsoft-entra-id" && profile?.sub) {
        const dbUser = await db.user.findUnique({
          where: { externalId: profile.sub },
          include: { userRoles: { include: { role: true } } },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.roles = dbUser.userRoles.map((ur) => ur.role.name);
          token.name = dbUser.name;
          token.email = dbUser.email;
          await db.user.update({
            where: { id: dbUser.id },
            data: { lastLogin: new Date() },
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.roles = (token.roles as string[]) ?? [];
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
