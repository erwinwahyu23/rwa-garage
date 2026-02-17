import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const engineNumber = searchParams.get("engineNumber");

  if (!engineNumber) {
    return NextResponse.json(
      { message: "engineNumber wajib diisi" },
      { status: 400 }
    );
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { engineNumber },
    select: {
      id: true,
      engineNumber: true,
      licensePlate: true,
      brand: true,
      model: true,
      ownerName: true,
      phoneNumber: true,
      visits: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          visitNumber: true,
          status: true,
          createdAt: true,
          diagnosis: true,
          pemeriksaan: true,
          sparepart: true,
          perbaikan: true,
          keluhan: true,
          items: {
            include: { sparePart: true }
          },
          mechanic: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json(
      { message: "Kendaraan tidak ditemukan" },
      { status: 404 }
    );
  }


  return NextResponse.json(vehicle);
}
