import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking Prisma Connection...");
    try {
        const count = await prisma.user.count();
        console.log(`Current user count: ${count}`);

        console.log("Trying to create test user...");
        const testUser = await prisma.user.create({
            data: {
                name: "Test User",
                username: "testuser_" + Date.now(),
                password: "password",
                role: UserRole.MEKANIK,
            }
        });
        console.log("✅ Success creating user:", testUser);
    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
