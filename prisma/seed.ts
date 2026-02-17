import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding USERS only...");

  const password = await bcrypt.hash("123123", 10);

  const superadmin = await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      name: "Super Admin",
      username: "superadmin",
      password,
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Admin RWA",
      username: "admin",
      password,
      role: UserRole.ADMIN,
      isActive: true,
      createdById: superadmin.id,
    },
  });

  const mekanik1 = await prisma.user.upsert({
    where: { username: "mekanik1" },
    update: {},
    create: {
      name: "Mekanik Satu",
      username: "mekanik1",
      password,
      role: UserRole.MEKANIK,
      isActive: true,
      createdById: admin.id,
    },
  });

  const mekanik2 = await prisma.user.upsert({
    where: { username: "mekanik2" },
    update: {},
    create: {
      name: "Mekanik Dua",
      username: "mekanik2",
      password,
      role: UserRole.MEKANIK,
      isActive: true,
      createdById: admin.id,
    },
  });

  console.log("✅ Users seeded:", {
    superadmin: superadmin.username,
    admin: admin.username,
    mekanik1: mekanik1.username,
    mekanik2: mekanik2.username,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
