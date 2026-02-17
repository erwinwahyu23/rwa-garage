import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ engineNumber: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // ✅ WAJIB await params
  const { engineNumber } = await context.params;

  const normalizedEngineNumber = decodeURIComponent(engineNumber).trim();

  // 🔍 DEBUG (sementara)
  console.log("ENGINE PARAM:", `"${normalizedEngineNumber}"`);

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      engineNumber: {
        equals: normalizedEngineNumber,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      engineNumber: true,
      brand: true,
      model: true,
      year: true,
      ownerName: true,
      phoneNumber: true,
      visits: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          visitNumber: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json(
      { message: "Vehicle not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(vehicle);
}
