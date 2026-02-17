import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth/options";

class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type AdminSession = Session & { user: Session["user"] & { role: string } };

/**
 * Server-side RBAC helper using next-auth session.
 * Throws a 403 error when the current session is not ADMIN.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = (await getServerSession(authOptions)) as AdminSession | null;
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    console.error("FORBIDEN", session?.user?.role);
    throw new HttpError("Forbidden", 403);
  }
  return session;
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new HttpError("Unauthorized", 401);
  }
  return session;
}
