import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

export async function POST(
  req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id: visitId } = await params as { id: string }

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { diagnosis: true, status: true, mechanicId: true },
  })

  if (!visit) {
    return NextResponse.json({ message: "Visit not found" }, { status: 404 })
  }

  // ❌ tidak boleh selesai tanpa diagnosis
  if (!visit.diagnosis || visit.diagnosis.trim().length === 0) {
    return NextResponse.json(
      { message: "Diagnosis belum diisi" },
      { status: 400 }
    )
  }

  // ❌ tidak boleh double selesai
  if (visit.status === "SELESAI" || visit.status === "BATAL") {
    return NextResponse.json(
      { message: "Visit sudah ditutup" },
      { status: 400 }
    )
  }

  // 🔐 hanya mekanik yang assigned
  if (
    session.user.role === "MEKANIK" &&
    visit.mechanicId !== session.user.id
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: "SELESAI",
      finishedAt: new Date(),
    },
  })

  return NextResponse.json({ message: "Visit selesai" })
}
