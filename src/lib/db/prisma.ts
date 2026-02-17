import type { PrismaClient } from "@prisma/client";
import { PrismaClient as PrismaClientImpl } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Explicitly annotate the exported prisma instance so TypeScript sees the generated model delegates
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClientImpl({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


// Force reload for SystemCounter
