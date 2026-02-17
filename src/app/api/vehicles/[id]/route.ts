import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

async function authorizeAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return null;
  }
  return session;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ message: "Bad Request - missing vehicle id" }, { status: 400 });
  }

  try {
    const vehicleWithVisits = await prisma.vehicle.findUnique({
      where: { id },
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
            createdAt: true,
            status: true,
            diagnosis: true,
            pemeriksaan: true,
            sparepart: true,
            perbaikan: true,
            keluhan: true,
            mechanic: { select: { name: true } },
          },
        },
      },
    });

    if (!vehicleWithVisits) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    const { visits, ...vehicle } = vehicleWithVisits;
    return NextResponse.json({ vehicle, visits });
  } catch (error) {
    console.error("GET VEHICLE ERROR:", error);
    return NextResponse.json({ message: "Failed to fetch vehicle" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorizeAdmin();
  if (!session) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ message: "Bad Request - missing vehicle id" }, { status: 400 });
  }

  const body = await req.json();

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(vehicle);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorizeAdmin();
  if (!session) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ message: "Bad Request - missing vehicle id" }, { status: 400 });
  }

  await prisma.vehicle.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
