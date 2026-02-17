import { DefaultSession, DefaultUser } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      username: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    username: string;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    username: string;
  }
}
