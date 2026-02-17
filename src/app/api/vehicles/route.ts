import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/* =========================
   GET - SEARCH VEHICLES
   ========================= */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();

  // Pagination parameters (if provided, return paginated list newest-first)
  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : null;
  const pageSizeParam = searchParams.get("pageSize");
  const pageSize = pageSizeParam
    ? Math.max(1, Math.min(100, Number(pageSizeParam) || 25))
    : 25;

  // If no search and page provided => return paginated list (newest first)
  if (!search && page !== null) {
    const total = await prisma.vehicle.count();
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        engineNumber: true,
        licensePlate: true,
        brand: true,
        model: true,
        ownerName: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ items: vehicles, total });
  }

  // Kalau kosong, biar tidak berat
  if (!search) {
    return NextResponse.json([]);
  }

  // support multi-word searches like "KIA SONET": split into terms and
  // require each term to appear in either `brand` or `model` (AND of ORs)
  const terms = search.split(/\s+/).filter(Boolean);

  const brandModelMatch = terms.length
    ? {
      AND: terms.map((t) => ({
        OR: [
          { brand: { contains: t, mode: 'insensitive' as Prisma.QueryMode } },
          { model: { contains: t, mode: 'insensitive' as Prisma.QueryMode } },
        ]
      }))
    }
    : undefined;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { engineNumber: { contains: search, mode: "insensitive" } },
        { licensePlate: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        // fallback single-field matches
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        // combined brand+model match
        ...(brandModelMatch ? [brandModelMatch] : []),
      ],
    },
    take: 20,
    orderBy: { engineNumber: "asc" },
    select: {
      id: true,
      engineNumber: true,
      licensePlate: true,
      brand: true,
      model: true,
      ownerName: true,
      phoneNumber: true,
    },
  });

  return NextResponse.json(vehicles);
}

/* =========================
   POST - CREATE VEHICLE
   ========================= */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const {
    engineNumber,
    licensePlate,
    brand,
    model,
    year,
    ownerName,
    phoneNumber,
  } = await req.json();

  // =====================
  // VALIDATION
  // =====================
  if (!engineNumber || !brand) {
    return NextResponse.json(
      { message: "Nomor mesin dan merk wajib diisi" },
      { status: 400 }
    );
  }

  try {
    // =====================
    // DUPLICATE CHECK
    // =====================
    const existing = await prisma.vehicle.findUnique({
      where: { engineNumber },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Nomor mesin sudah terdaftar" },
        { status: 409 }
      );
    }

    // =====================
    // CREATE VEHICLE ONLY
    // =====================
    const vehicle = await prisma.vehicle.create({
      data: {
        engineNumber,
        licensePlate: licensePlate || null,
        brand,
        model: model || null,
        year: year ? Number(year) : null,
        ownerName: ownerName || null,
        phoneNumber: phoneNumber || null,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("CREATE VEHICLE ERROR:", error);

    // Prisma specific error (fallback)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { message: "Nomor mesin sudah terdaftar" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: "Gagal menyimpan kendaraan" },
      { status: 500 }
    );
  }
}
