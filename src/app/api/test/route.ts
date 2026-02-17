import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const users = await prisma.user.findMany();
  return Response.json(users);
}
