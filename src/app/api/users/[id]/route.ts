import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const isSelf = session.user.id === id;

    if (!isSuperAdmin && !isSelf) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, password, isActive } = body;

    const data: any = {};

    if (name) {
        data.name = name;
    }

    if (typeof isActive === "boolean") {
        // Only Superadmin can change active status
        if (isSuperAdmin) {
            data.isActive = isActive;
        }
    }

    if (body.role && isSuperAdmin) {
        data.role = body.role;
    }

    if (password) {
        data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
        where: { id },
        data,
    });

    return NextResponse.json(user);
}
