import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const where = isSuperAdmin ? {} : { id: session.user.id };

    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    return NextResponse.json(users);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { name, username, password, role } = await req.json();

    if (!name || !username || !password || !role) {
        return NextResponse.json(
            { message: "Semua field wajib diisi" },
            { status: 400 }
        );
    }

    // Check unique username (case-insensitive)
    const exists = await prisma.user.findFirst({
        where: {
            username: {
                equals: username,
                mode: "insensitive"
            }
        },
    });

    if (exists) {
        return NextResponse.json(
            { message: "Username sudah digunakan" },
            { status: 400 }
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            username,
            password: hashedPassword,
            role,
            isActive: true,
            createdById: session.user.id,
        },
    });

    return NextResponse.json(user);
}
