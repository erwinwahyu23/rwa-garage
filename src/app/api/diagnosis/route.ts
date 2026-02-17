import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Admin tidak boleh simpan/update diagnosis
  if (session.user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin tidak diperbolehkan mengubah diagnosis" },
      { status: 403 }
    );
  }

  const { visitId, diagnosis, pemeriksaan, sparepart, perbaikan, keluhan, items } =
    await req.json();

  if (!visitId || !diagnosis) {
    return NextResponse.json(
      { error: "visitId dan diagnosis wajib diisi" },
      { status: 400 }
    );
  }

  // 🔍 Ambil visit
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      status: true,
      mechanicId: true,
      diagnosis: true,
    },
  });

  if (!visit) {
    return NextResponse.json(
      { error: "Visit tidak ditemukan" },
      { status: 404 }
    );
  }

  // Mekanik hanya boleh update visit miliknya (kecuali SUPERADMIN)
  if (visit.mechanicId !== session.user.id && session.user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Visit ini bukan milikmu" },
      { status: 403 }
    );
  }

  // Visit terkunci
  if (visit.status === "SELESAI" || visit.status === "BATAL") {
    return NextResponse.json(
      { error: "Diagnosis sudah dikunci" },
      { status: 403 }
    );
  }

  // Diagnosis pertama?
  const isFirstDiagnosis = visit.diagnosis === null;

  // Transaction operations
  const txOps: any[] = [
    prisma.visit.update({
      where: { id: visitId },
      data: {
        keluhan,
        diagnosis,
        pemeriksaan,
        sparepart,
        perbaikan,
        status: isFirstDiagnosis ? "PROSES" : undefined,
      },
    }),
  ];

  // Handle Visit Items (Logical Stock)
  if (items && Array.isArray(items)) {
    // 1. Clear existing items for this visit (simple replacement)
    // Note: This relies on VisitItem model existing. 
    // If prisma client is old, this line will throw runtime error until server restart.
    txOps.push(prisma.visitItem.deleteMany({ where: { visitId } }));

    // 2. Add new items
    if (items.length > 0) {
      txOps.push(
        prisma.visitItem.createMany({
          data: items.map((item: any) => ({
            visitId,
            sparePartId: item.sparePartId,
            quantity: Number(item.quantity || 1),
            price: 0, // We don't fetch price here yet to keep it fast. Invoice will handle final pricing.
          })),
        })
      );
    }
  }

  await prisma.$transaction(txOps);

  return NextResponse.json({ success: true });
}
