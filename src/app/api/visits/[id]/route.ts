import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { status, mechanicId, action } = body;

  if (!id) {
    return NextResponse.json(
      { message: "ID tidak ditemukan di route" },
      { status: 400 }
    );
  }

  try {
    /**
     * =========================
     * 2️⃣ ADMIN ASSIGN / GANTI MEKANIK
     * =========================
     */
    if (mechanicId && (session.user.role === "ADMIN" || session.user.role === "SUPERADMIN")) {
      return NextResponse.json(
        await prisma.visit.update({
          where: { id },
          data: { mechanicId },
        })
      );
    }
    /**
     * =========================
     * 1️⃣ BATAL (ADMIN)
     * =========================
     */
    if (status === "BATAL") {
      if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json(
        await prisma.visit.update({
          where: { id },
          data: { status: "BATAL" },
        })
      );
    }
    /**
     * =========================
     * 3️⃣ MEKANIK AMBIL / KERJAKAN (LOCK)
     * =========================
     */
    if (action === "TAKE") {
      if (session.user.role !== "MEKANIK") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const visit = await prisma.visit.findUnique({ where: { id } });

      if (!visit) {
        return NextResponse.json(
          { message: "Visit not found" },
          { status: 404 }
        );
      }

      //SUDAH DIAMBIL MEKANIK LAIN
      if (visit.mechanicId && visit.mechanicId !== session.user.id) {
        return NextResponse.json(
          { message: "Visit sudah diambil mekanik lain" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        await prisma.visit.update({
          where: { id },
          data: {
            mechanicId: visit.mechanicId ?? session.user.id,
          },
        })
      );
    }

    /**
     * =========================
     * SELESAI (MEKANIK PEMILIK)
     * =========================
     */
    if (status === "SELESAI") {
      const isMechanic = session.user.role === "MEKANIK";
      const isSuperAdmin = session.user.role === "SUPERADMIN";

      if (!isMechanic && !isSuperAdmin) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const visit = await prisma.visit.findUnique({
        where: { id },
        select: {
          status: true,
          mechanicId: true,
          diagnosis: true,
          pemeriksaan: true,
          sparepart: true,
          perbaikan: true,
        },
      });

      if (!visit) {
        return NextResponse.json(
          { message: "Visit not found" },
          { status: 404 }
        );
      }

      // If mechanic, enforce ownership
      if (isMechanic && visit.mechanicId !== session.user.id) {
        return NextResponse.json(
          { message: "Bukan mekanik pemilik visit" },
          { status: 403 }
        );
      }

      //  belum PROSES
      if (visit.status !== "PROSES") {
        return NextResponse.json(
          { message: "Visit belum dalam proses" },
          { status: 400 }
        );
      }

      //  VALIDASI DIAGNOSIS WAJIB ADA
      if (
        !visit.diagnosis ||
        !visit.pemeriksaan ||
        !visit.sparepart ||
        !visit.perbaikan
      ) {
        return NextResponse.json(
          { message: "Diagnosis belum lengkap" },
          { status: 400 }
        );
      }
      // BOLEH SELESAI
      return NextResponse.json(
        await prisma.visit.update({
          where: { id },
          data: {
            status: "SELESAI",
            finishedAt: new Date(), // final lock
          },
        })
      );
    }

    /**
     * =========================
     * DEFAULT RESPONSE (WAJIB)
     * =========================
     */
    return NextResponse.json(
      { message: "Tidak ada aksi valid" },
      { status: 400 }
    );
  } catch (error) {
    console.error("PATCH VISIT ERROR:", error);
    return NextResponse.json(
      { message: "Gagal update visit" },
      { status: 500 }
    );
  }
}
