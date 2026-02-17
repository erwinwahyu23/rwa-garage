import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding 'Erwin'...");
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'Erwin', mode: 'insensitive' } },
        { name: { contains: 'Erwin', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Found:", JSON.stringify(users, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
