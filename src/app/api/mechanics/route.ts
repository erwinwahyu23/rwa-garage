import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export const runtime = "nodejs";
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const mechanics = await prisma.user.findMany({
    where: { role: "MEKANIK" },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(mechanics);
}
