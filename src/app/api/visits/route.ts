import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { generateVisitNumber } from "@/lib/visit-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= POST (CREATE VISIT) ================= */

export async function POST(req: Request) {
  console.log("🔥 POST /api/visits HIT");
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { vehicleId } = await req.json();
  if (!vehicleId) {
    return NextResponse.json(
      { message: "vehicleId wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const visitNumber = await generateVisitNumber();

    const visit = await prisma.visit.create({
      data: {
        visitNumber,
        vehicleId,
        status: "ANTRI",
        mechanicId:
          session.user.role === "MEKANIK" ? session.user.id : null,
        //createdById: session.user.id,
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error: any) {
    console.error("CREATE VISIT ERROR:", error);

    // 🔒 UNIQUE ACTIVE VISIT
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Kendaraan masih memiliki kunjungan aktif" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Gagal membuat kunjungan" },
      { status: 500 }
    );
  }
}

/* ================= GET (WORKLIST) ================= */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const role = session.user.role;
  const userId = session.user.id;

  const where: any = {
    AND: [
      { status: { in: ["ANTRI", "PROSES"] } },
    ],
  };

  // 🔥 Mekanik hanya lihat antri + miliknya
  if (role === "MEKANIK") {
    where.AND.push({
      OR: [
        { mechanicId: null },
        { mechanicId: userId },
      ],
    });
  }

  // 🔍 Search global (support multi-word brand+model, e.g. "KIA SONET")
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
        // single-field brand/model fallback
        { vehicle: { brand: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        ...(brandModelMatch ? [brandModelMatch] : []),
      ],
    });
  }

  const visits = await prisma.visit.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      vehicle: {
        select: {
          id: true,
          engineNumber: true,
          licensePlate: true,
          brand: true,
          model: true,
          ownerName: true,
          phoneNumber: true
        }
      },
      mechanic: { select: { id: true, name: true } },
      items: { include: { sparePart: true } },
    },
  });

  // ⬅️ ARRAY LANGSUNG (sesuai WorklistPage)
  return NextResponse.json(visits);
}
