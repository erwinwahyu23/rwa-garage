import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    fs.writeFileSync("users_dump.txt", JSON.stringify(users, null, 2));
    console.log("Dumped to users_dump.txt");
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
