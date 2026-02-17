import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // support multi-word queries like "KIA SONET"
  const terms = q.split(/\s+/).filter(Boolean);

  const brandModelMatch = terms.length
    ? { AND: terms.map((t) => ({ OR: [
        { brand: { contains: t, mode: 'insensitive' as Prisma.QueryMode } },
        { model: { contains: t, mode: 'insensitive' as Prisma.QueryMode } },
      ] })) }
    : undefined;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { engineNumber: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
        { phoneNumber: { contains: q, mode: 'insensitive' as Prisma.QueryMode } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        ...(brandModelMatch ? [brandModelMatch] : []),
      ],
    },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      visits: {
        where: {
          status: { in: ["ANTRI", "PROSES"] },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      },
    },
  });

  return NextResponse.json(vehicles);
}
