import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const mechanics = await prisma.user.findMany({
    where: { role: "MEKANIK" },
    select: {
      id: true,
      name: true,
    },
  })

  return NextResponse.json(mechanics)
}
