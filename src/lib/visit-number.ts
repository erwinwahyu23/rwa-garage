import { prisma } from "@/lib/db/prisma";

export async function generateVisitNumber() {
  const now = new Date();

  // 🔥 AMBIL TANGGAL LOKAL (BUKAN UTC)
  const year = now.getFullYear() % 100;
  const twoDigitYear = year.toString().padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const dateStr = `${twoDigitYear}${month}${day}`; // 251220
  const prefix = `RWA-${dateStr}-`;

  // 🔥 CARI VISIT TERAKHIR DI HARI INI SAJA
  const lastVisitToday = await prisma.visit.findFirst({
    where: {
      visitNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      visitNumber: "desc",
    },
    select: {visitNumber: true,},
  });

  let nextNumber = 1;

  if (lastVisitToday) {
    const lastSeq = Number(
      lastVisitToday.visitNumber.split("-")[2]
    );
    nextNumber = lastSeq + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}
