import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { generateVisitNumber } from "@/lib/visit-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= POST ================= */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { vehicleId, keluhan } = await req.json();

  if (!vehicleId) {
    return NextResponse.json(
      { message: "vehicleId wajib diisi" },
      { status: 400 }
    );
  }

  const visitNumber = await generateVisitNumber();
  const isMechanic = session.user.role === "MEKANIK";

  const visit = await prisma.visit.create({
    data: {
      visitNumber,
      vehicleId,
      keluhan,
      status: "ANTRI",
      mechanicId: isMechanic ? session.user.id : null,
    },
    include: {
      vehicle: true,
      mechanic: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(visit);
}

/* ================= GET HISTORY ================= */
export async function GET(req: Request) {
  console.log("🔥 GET /api/visits/history RE-ENABLED 🔥");
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const scope = searchParams.get("scope") || "worklist";
  const search = searchParams.get("search")?.trim();
  const statusParam = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const mechanicIdParam = searchParams.get("mechanicId");

  const role = session.user.role;
  const userId = session.user.id;

  const where: any = { AND: [] };

  // =====================
  // SCOPE
  // =====================
  if (scope === "history") {
    if (statusParam && ["SELESAI", "BATAL"].includes(statusParam)) {
      where.AND.push({ status: statusParam });
    } else {
      where.AND.push({ status: { in: ["SELESAI", "BATAL"] } });
    }

    if (dateFrom || dateTo) {
      where.AND.push({
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom + "T00:00:00") }),
          ...(dateTo && { lte: new Date(dateTo + "T23:59:59") }),
        },
      });
    }
  } else {
    where.AND.push({ status: { in: ["ANTRI", "PROSES"] } });
  }

  // =====================
  // ROLE
  // =====================
  if (role === "MEKANIK") {
    if (scope === "history") {
      where.AND.push({ mechanicId: userId });
    } else {
      where.AND.push({
        OR: [{ mechanicId: null }, { mechanicId: userId }],
      });
    }
  }

  if (role === "ADMIN" && mechanicIdParam) {
    where.AND.push({ mechanicId: mechanicIdParam });
  }

  // =====================
  // SEARCH (support multi-word brand+model)
  // =====================
  if (search) {
    const terms = search.split(/\s+/).filter(Boolean);

    const brandModelMatch = terms.length
      ? {
        AND: terms.map((t) => ({
          OR: [
            { vehicle: { brand: { contains: t, mode: 'insensitive' as Prisma.QueryMode } } },
            { vehicle: { model: { contains: t, mode: 'insensitive' as Prisma.QueryMode } } },
          ]
        }))
      }
      : undefined;

    where.AND.push({
      OR: [
        { visitNumber: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { vehicle: { engineNumber: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { vehicle: { ownerName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { vehicle: { brand: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { mechanic: { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        ...(brandModelMatch ? [brandModelMatch] : []),
      ],
    });
  }

  const total = await prisma.visit.count({ where });

  const data = await prisma.visit.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc", },
    include: {
      vehicle: true,
      mechanic: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
