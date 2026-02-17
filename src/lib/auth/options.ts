import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 5 * 60 * 60, // 5 jam
    updateAge: 5 * 60,   // 5 menit
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            username: {
              equals: credentials.username,
              mode: "insensitive"
            }
          },
        });

        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!valid) {
          return null;
        }

        // ⛔ Check Active Status
        if (!user.isActive) {
          throw new Error("Akun dinonaktifkan. Hubungi Administrator.");
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        (session.user as any).username = token.username as string;
      }
      return session;
    },
  },
};
