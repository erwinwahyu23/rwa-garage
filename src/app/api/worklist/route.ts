import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  const visits = await prisma.visit.findMany({
    where: isAdmin
      ? undefined
      : { mechanicId: session.user.id },
    include: {
      vehicle: true,
      mechanic: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json(visits);
}
